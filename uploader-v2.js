export function initializeUploader(supabaseClient, options) {
  const fileInput = document.getElementById(options.fileInputId);
  const uploadButton = document.getElementById(options.uploadButtonId);
  const fileDetails = document.getElementById(options.fileDetailsId);
  const fileNameDisplay = document.getElementById(options.fileNameDisplayId);
  const fileSizeDisplay = document.getElementById(options.fileSizeDisplayId);
  const removeButton = document.getElementById(options.removeButtonId);

  let files = [];
  let uploading = false;

  // Handle file selection
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
        uploadButton.click();  // Automatically trigger the upload
      }
    }
  });

  uploadButton.addEventListener('click', async () => {
    if (uploading) return;
    uploading = true;
    uploadButton.textContent = 'Uploading...';
    uploadButton.disabled = true;

    try {
      let folderName = options.folderBaseName;
      if (files.length > 1) {
        folderName = await getNewFolderName(supabaseClient, options.bucketName, folderName);
      }

      const uploadPromises = files.map(async (file) => {
        const timestamp = new Date();
        const formattedDate = `${(timestamp.getMonth() + 1).toString().padStart(2, '0')}${timestamp.getDate().toString().padStart(2, '0')}${timestamp.getFullYear().toString().slice(2)}-${timestamp.getHours().toString().padStart(2, '0')}${timestamp.getMinutes().toString().padStart(2, '0')}${timestamp.getSeconds().toString().padStart(2, '0')}`;

        const fileName = `${formattedDate}-${file.name}`;
        const filePath = `${folderName}/${fileName}`;

        console.log(`Uploading file: ${file.name} to ${filePath}`);

        const { data, error } = await supabaseClient.storage
          .from(options.bucketName)
          .upload(filePath, file);

        if (error) {
          console.error(`Error uploading ${file.name}:`, error.message);
          throw error;
        }

        const { data: urlData, error: urlError } = await supabaseClient.storage
          .from(options.bucketName)
          .getPublicUrl(filePath);

        if (urlError) {
          console.error(`Error getting URL for ${file.name}:`, urlError.message);
          throw urlError;
        }

        return urlData.publicUrl;
      });

      const fileURLs = await Promise.all(uploadPromises);
      console.log('Uploaded file URLs:', fileURLs);

      options.onUploadSuccess(fileURLs);
    } catch (error) {
      console.error('Error uploading files:', error);
      options.onUploadError(error);
    } finally {
      uploading = false;
      uploadButton.textContent = 'Upload';
      uploadButton.disabled = false;
    }
  });

  removeButton.addEventListener('click', () => {
    fileInput.value = '';
    fileNameDisplay.textContent = '';
    fileSizeDisplay.textContent = '';
    fileDetails.style.display = 'none';
    removeButton.style.display = 'none';
  });

  async function getNewFolderName(supabaseClient, bucketName, folderBaseName) {
    let index = 0;
    let folderExists = true;

    while (folderExists) {
      index++;
      const folderName = `${folderBaseName}-${index}`;
      const { data, error } = await supabaseClient.storage
        .from(bucketName)
        .list(folderName);

      folderExists = !error && data && data.length > 0;
    }

    return `${folderBaseName}-${index}`;
  }
}
