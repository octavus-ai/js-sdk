import type { FileReference } from '@octavus/core';

/**
 * Response from the upload URLs endpoint
 */
export interface UploadUrlsResponse {
  files: {
    id: string;
    uploadUrl: string;
    downloadUrl: string;
  }[];
}

/**
 * Options for uploading files
 */
export interface UploadFilesOptions {
  /**
   * Function to request upload URLs from the platform.
   * Consumer apps must implement this to authenticate with the platform.
   *
   * @param files - Array of file metadata to request URLs for
   * @returns Response with presigned upload and download URLs
   *
   * @example
   * ```typescript
   * requestUploadUrls: async (files) => {
   *   const response = await fetch('/api/upload-urls', {
   *     method: 'POST',
   *     headers: { 'Content-Type': 'application/json' },
   *     body: JSON.stringify({ sessionId, files }),
   *   });
   *   return response.json();
   * }
   * ```
   */
  requestUploadUrls: (
    files: { filename: string; mediaType: string; size: number }[],
  ) => Promise<UploadUrlsResponse>;

  /**
   * Callback for upload progress (0-100 per file).
   * Called multiple times during upload with real-time progress.
   *
   * @param fileIndex - Index of the file being uploaded
   * @param progress - Progress percentage (0-100)
   */
  onProgress?: (fileIndex: number, progress: number) => void;
}

/**
 * Upload a single file to S3 with progress tracking.
 * Uses XMLHttpRequest for upload progress events (fetch doesn't support this).
 */
function uploadFileWithProgress(
  url: string,
  file: File,
  onProgress?: (progress: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress?.(progress);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed: network error'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload aborted'));
    });

    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.send(file);
  });
}

/**
 * Upload files to the Octavus platform.
 *
 * This function:
 * 1. Requests presigned upload URLs from the platform
 * 2. Uploads each file directly to S3 with progress tracking
 * 3. Returns file references that can be used in trigger input
 *
 * @param files - Files to upload (from file input or drag/drop)
 * @param options - Upload configuration
 * @returns Array of file references with download URLs
 *
 * @example
 * ```typescript
 * const fileRefs = await uploadFiles(fileInputRef.current.files, {
 *   requestUploadUrls: async (files) => {
 *     const response = await fetch('/api/upload-urls', {
 *       method: 'POST',
 *       headers: { 'Content-Type': 'application/json' },
 *       body: JSON.stringify({ sessionId, files }),
 *     });
 *     return response.json();
 *   },
 *   onProgress: (fileIndex, progress) => {
 *     console.log(`File ${fileIndex}: ${progress}%`);
 *   },
 * });
 * ```
 */
export async function uploadFiles(
  files: FileList | File[],
  options: UploadFilesOptions,
): Promise<FileReference[]> {
  const fileArray = Array.from(files);

  if (fileArray.length === 0) {
    return [];
  }

  const { files: uploadInfos } = await options.requestUploadUrls(
    fileArray.map((f) => ({
      filename: f.name,
      mediaType: f.type || 'application/octet-stream',
      size: f.size,
    })),
  );

  const references: FileReference[] = [];

  for (let i = 0; i < fileArray.length; i++) {
    const file = fileArray[i]!;
    const uploadInfo = uploadInfos[i]!;

    await uploadFileWithProgress(uploadInfo.uploadUrl, file, (progress) => {
      options.onProgress?.(i, progress);
    });

    references.push({
      id: uploadInfo.id,
      mediaType: file.type || 'application/octet-stream',
      url: uploadInfo.downloadUrl,
      filename: file.name,
      size: file.size,
    });
  }

  return references;
}
