export function initializeUploader(options) {
  const {
    supabaseClient,
    bucketName,
    folderBaseName,
    fileInputId,
    uploadButtonId,
    fileDetailsContainerId,
    fileURLContainerId,
    removeButtonId,
    onUploadSuccess,
    onUploadError
  } = options;

  const fileInput = document.getElementById(fileInputId);
  const uploadButton = document.getElementById(uploadButtonId);
  const fileURLContainer = document.getElementById(fileURLContainerId);
  const fileDetails = document.getElementById(fileDetailsContainerId);
  const fileNameDisplay = document.getElementById('fileNameDisplay');
  const fileSizeDisplay = document.getElementById('fileSizeDisplay');
  const removeButton = document.getElementById(removeButtonId);

  let files = [];
  let uploading = false;

  fileInput.addEventListener('change', (event) => {
    files = Array.from(event.target.files);

    if (files.length > 0) {
      const totalSize = files.reduce((acc, file) => acc + file.size, 0);
      const fileNames = files.map(file => file.name).join(', ');
      fileNameDisplay.textContent = `Files: ${fileNames}`;
      fileSizeDisplay.textContent = `Total Size: ${(totalSize / (1024 * 1024)).toFixed(2)} MB`;
      fileDetails.style.display = 'flex';
      removeButton.style.display = 'block';

      if (!uploading) {
        uploadButton.click();
      }
    }
  });

  uploadButton.addEventListener('click', async () => {
    if (uploading) return;
    uploading = true;
    uploadButton.textContent = 'Uploading...';
    uploadButton.disabled = true;

    try {
      let folderName = folderBaseName;

      // Determine folder name based on the number of files
      if (files.length > 1) {
        const timestamp = new Date();
        const formattedDate = `${(timestamp.getMonth() + 1).toString().padStart(2, '0')}${timestamp.getDate().toString().padStart(2, '0')}${timestamp.getFullYear().toString().slice(2)}`;
        folderName = `${folderBaseName}/${formattedDate}`;
      }

      // Upload each file
      const uploadPromises = files.map(async (file) => {
        const filePath = `${folderName}/${file.name}`;

        console.log(`Uploading file: ${file.name} to ${filePath}`);

        const { data, error } = await supabaseClient.storage
          .from(bucketName)
          .upload(filePath, file);

        if (error) {
          console.error(`Error uploading ${file.name}:`, error.message);
          throw error;
        }

        const { data: urlData, error: urlError } = await supabaseClient.storage
          .from(bucketName)
          .getPublicUrl(filePath);

        if (urlError) {
          console.error(`Error getting URL for ${file.name}:`, urlError.message);
          throw urlError;
        }

        return urlData.publicUrl;
      });

      const fileURLs = await Promise.all(uploadPromises);
      console.log('Uploaded file URLs:', fileURLs);

      if (fileURLContainer) {
        fileURLContainer.value = fileURLs.join('\n');
      } else {
        console.error('fileURLContainer is null');
      }

      if (onUploadSuccess) {
        onUploadSuccess(fileURLs);
      }

      alert('Files uploaded successfully.');
    } catch (error) {
      console.error('Error uploading files:', error);
      if (onUploadError) {
        onUploadError(error);
      } else {
        console.log(`Error uploading files: ${error.message}`);
      }
    } finally {
      uploading = false;
      uploadButton.textContent = 'Upload';
      uploadButton.disabled = false;
    }
  });

  if (removeButton) {
    removeButton.addEventListener('click', () => {
      fileInput.value = '';
      fileURLContainer.value = '';
      fileNameDisplay.textContent = '';
      fileSizeDisplay.textContent = '';
      fileDetails.style.display = 'none';
      removeButton.style.display = 'none';
    });
  }
}
