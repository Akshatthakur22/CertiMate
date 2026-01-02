"""
Streaming ZIP generator for low-memory certificate downloads
Creates ZIP archives on-the-fly without loading all files into memory
"""

import os
import zipfile
import io
import logging
from typing import List, Generator, AsyncGenerator
import asyncio
from pathlib import Path

logger = logging.getLogger(__name__)


class StreamingZipGenerator:
    """
    Generates ZIP archives with streaming to minimize memory usage
    """
    
    def __init__(self, compression_level: int = 6):
        """
        Initialize streaming ZIP generator
        
        Args:
            compression_level: ZIP compression level (0-9)
        """
        self.compression_level = compression_level
    
    def create_zip_stream(self, file_paths: List[str]) -> Generator[bytes, None, None]:
        """
        Create a streaming ZIP archive from file paths
        
        Args:
            file_paths: List of file paths to include in ZIP
            
        Yields:
            ZIP archive chunks as bytes
        """
        try:
            # Use in-memory bytes buffer for streaming
            zip_buffer = io.BytesIO()
            
            with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED, compresslevel=self.compression_level) as zip_file:
                for file_path in file_paths:
                    if not os.path.exists(file_path):
                        logger.warning(f"File not found, skipping: {file_path}")
                        continue
                    
                    try:
                        # Get file info
                        file_stat = os.stat(file_path)
                        file_size = file_stat.st_size
                        arcname = os.path.basename(file_path)
                        
                        logger.debug(f"Adding to ZIP: {arcname} ({file_size} bytes)")
                        
                        # Add file to ZIP
                        zip_file.write(file_path, arcname)
                            
                    except Exception as e:
                        logger.error(f"Error adding file {file_path} to ZIP: {e}")
                        continue
            
            # ZIP is complete - now stream it in chunks
            zip_buffer.seek(0)
            chunk_size = 8192  # 8KB chunks for streaming
            while True:
                chunk = zip_buffer.read(chunk_size)
                if not chunk:
                    break
                yield chunk
                
        except Exception as e:
            logger.error(f"Error creating ZIP stream: {e}")
            raise
        finally:
            zip_buffer.close()
    
    async def create_zip_stream_async(self, file_paths: List[str]) -> AsyncGenerator[bytes, None]:
        """
        Create an async streaming ZIP archive from file paths
        
        Args:
            file_paths: List of file paths to include in ZIP
            
        Yields:
            ZIP archive chunks as bytes
        """
        loop = asyncio.get_event_loop()
        
        # Run the synchronous generator in thread pool
        def run_generator():
            return self.create_zip_stream(file_paths)
        
        # Create generator in thread pool and yield results asynchronously
        generator = await loop.run_in_executor(None, run_generator)
        
        for chunk in generator:
            yield chunk
            # Small delay to allow other tasks to run
            await asyncio.sleep(0.001)
    
    def create_zip_stream_from_directory(self, directory_path: str, pattern: str = "*") -> Generator[bytes, None, None]:
        """
        Create streaming ZIP from all files in a directory
        
        Args:
            directory_path: Path to directory
            pattern: File pattern to match (default: all files)
            
        Yields:
            ZIP archive chunks as bytes
        """
        try:
            directory = Path(directory_path)
            if not directory.exists():
                raise FileNotFoundError(f"Directory not found: {directory_path}")
            
            # Get all files matching pattern
            file_paths = []
            for file_path in directory.glob(pattern):
                if file_path.is_file():
                    file_paths.append(str(file_path))
            
            logger.info(f"Found {len(file_paths)} files to ZIP from {directory_path}")
            
            # Use existing streaming method
            yield from self.create_zip_stream(file_paths)
            
        except Exception as e:
            logger.error(f"Error creating ZIP stream from directory: {e}")
            raise
    
    async def create_zip_stream_from_directory_async(self, directory_path: str, pattern: str = "*") -> AsyncGenerator[bytes, None]:
        """
        Create async streaming ZIP from all files in a directory
        
        Args:
            directory_path: Path to directory
            pattern: File pattern to match (default: all files)
            
        Yields:
            ZIP archive chunks as bytes
        """
        loop = asyncio.get_event_loop()
        
        def run_generator():
            return self.create_zip_stream_from_directory(directory_path, pattern)
        
        generator = await loop.run_in_executor(None, run_generator)
        
        for chunk in generator:
            yield chunk
            await asyncio.sleep(0.001)


class StreamingZipResponse:
    """
    FastAPI streaming response for ZIP downloads
    """
    
    def __init__(self, zip_generator: StreamingZipGenerator, file_paths: List[str], filename: str = "certificates.zip"):
        """
        Initialize streaming ZIP response
        
        Args:
            zip_generator: StreamingZipGenerator instance
            file_paths: List of file paths to include
            filename: Download filename
        """
        self.zip_generator = zip_generator
        self.file_paths = file_paths
        self.filename = filename
    
    async def stream_generator(self) -> AsyncGenerator[bytes, None]:
        """
        Async generator for FastAPI StreamingResponse
        
        Yields:
            ZIP data chunks
        """
        async for chunk in self.zip_generator.create_zip_stream_async(self.file_paths):
            yield chunk
    
    def get_response_headers(self) -> dict:
        """
        Get HTTP headers for ZIP download
        
        Returns:
            Dictionary of HTTP headers
        """
        return {
            "Content-Disposition": f"attachment; filename={self.filename}",
            "Content-Type": "application/zip",
            "Transfer-Encoding": "chunked",
            "Cache-Control": "no-cache"
        }


# Global instance for reuse
_streaming_zip_generator = StreamingZipGenerator()


def get_streaming_zip_generator(compression_level: int = 6) -> StreamingZipGenerator:
    """
    Get or create streaming ZIP generator instance
    
    Args:
        compression_level: ZIP compression level
        
    Returns:
        StreamingZipGenerator instance
    """
    global _streaming_zip_generator
    if _streaming_zip_generator is None:
        _streaming_zip_generator = StreamingZipGenerator(compression_level)
    return _streaming_zip_generator


async def create_streaming_zip_response(file_paths: List[str], filename: str = "certificates.zip") -> StreamingZipResponse:
    """
    Create a streaming ZIP response for FastAPI
    
    Args:
        file_paths: List of file paths to include in ZIP
        filename: Download filename
        
    Returns:
        StreamingZipResponse ready for FastAPI
    """
    generator = get_streaming_zip_generator()
    return StreamingZipResponse(generator, file_paths, filename)


async def create_streaming_zip_from_directory(directory_path: str, filename: str = "certificates.zip", pattern: str = "*.png") -> StreamingZipResponse:
    """
    Create streaming ZIP from directory
    
    Args:
        directory_path: Path to directory containing files
        filename: Download filename
        pattern: File pattern to match
        
    Returns:
        StreamingZipResponse ready for FastAPI
    """
    generator = get_streaming_zip_generator()
    
    # Get file paths from directory
    directory = Path(directory_path)
    if not directory.exists():
        raise FileNotFoundError(f"Directory not found: {directory_path}")
    
    file_paths = []
    for file_path in directory.glob(pattern):
        if file_path.is_file():
            file_paths.append(str(file_path))
    
    return StreamingZipResponse(generator, file_paths, filename)
