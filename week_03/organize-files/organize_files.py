#!/usr/bin/env python3
"""
File Organizer Script
Organizes files in a directory into subfolders: images, videos, audios, documents
"""

import os
import shutil
from pathlib import Path


def get_file_category(file_path):
    """
    Determine the category of a file based on its extension.
    
    Args:
        file_path: Path to the file
        
    Returns:
        Category name: 'images', 'videos', 'audios', 'documents', or None
    """
    extension = file_path.suffix.lower()
    
    # Image extensions
    image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', 
                        '.webp', '.tiff', '.ico', '.heic', '.heif'}
    
    # Video extensions
    video_extensions = {'.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', 
                        '.mkv', '.m4v', '.3gp', '.ogv', '.mpg', '.mpeg'}
    
    # Audio extensions
    audio_extensions = {'.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma', 
                        '.m4a', '.opus', '.amr', '.aiff', '.au'}
    
    # Document extensions
    document_extensions = {'.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt', 
                           '.xls', '.xlsx', '.ppt', '.pptx', '.csv', '.xml', 
                           '.html', '.htm', '.epub', '.mobi', '.pages', 
                           '.numbers', '.key'}
    
    if extension in image_extensions:
        return 'images'
    elif extension in video_extensions:
        return 'videos'
    elif extension in audio_extensions:
        return 'audios'
    elif extension in document_extensions:
        return 'documents'
    else:
        return None


def organize_files(source_dir):
    """
    Organize files in the source directory into subfolders.
    
    Args:
        source_dir: Path to the directory containing files to organize
    """
    source_path = Path(source_dir)
    
    if not source_path.exists():
        print(f"Error: Directory '{source_dir}' does not exist.")
        return
    
    if not source_path.is_dir():
        print(f"Error: '{source_dir}' is not a directory.")
        return
    
    # Create subfolders
    categories = ['images', 'videos', 'audios', 'documents']
    for category in categories:
        category_path = source_path / category
        category_path.mkdir(exist_ok=True)
        print(f"Created/verified folder: {category}")
    
    # Count files moved
    moved_counts = {category: 0 for category in categories}
    skipped_files = []
    
    # Process all files in the source directory
    for file_path in source_path.iterdir():
        # Skip directories and hidden files
        if file_path.is_dir() or file_path.name.startswith('.'):
            continue
        
        category = get_file_category(file_path)
        
        if category:
            destination = source_path / category / file_path.name
            
            # Handle duplicate filenames
            if destination.exists():
                base_name = file_path.stem
                extension = file_path.suffix
                counter = 1
                while destination.exists():
                    new_name = f"{base_name}_{counter}{extension}"
                    destination = source_path / category / new_name
                    counter += 1
            
            try:
                shutil.move(str(file_path), str(destination))
                moved_counts[category] += 1
                print(f"Moved: {file_path.name} -> {category}/")
            except Exception as e:
                print(f"Error moving {file_path.name}: {e}")
                skipped_files.append(file_path.name)
        else:
            skipped_files.append(file_path.name)
            print(f"Skipped (unknown type): {file_path.name}")
    
    # Print summary
    print("\n" + "="*50)
    print("Organization Summary:")
    print("="*50)
    for category in categories:
        print(f"{category.capitalize()}: {moved_counts[category]} files")
    
    if skipped_files:
        print(f"\nSkipped files: {len(skipped_files)}")
        print("(Files with unknown extensions were not moved)")
    
    print("="*50)


if __name__ == "__main__":
    # Default to sample_data_file_organizer folder
    default_folder = "sample_data_file_organizer"
    
    import sys
    if len(sys.argv) > 1:
        folder_to_organize = sys.argv[1]
    else:
        folder_to_organize = default_folder
    
    print(f"Organizing files in: {folder_to_organize}")
    print("-" * 50)
    organize_files(folder_to_organize)

