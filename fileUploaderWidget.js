// fileUploaderWidget.js

export function initializeUploader(supabaseClient, options) {
  // Create and return a new uploader widget
  const { bucketName, folderBaseName, onUploadSuccess, onUploadError } = options;

  // Create the file input element
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.multiple = true;
  fileInput.style.display = 'none';
  
  // Create a button to trigger the file input
  const uploadButton = document.createElement('button');
  uploadButton.textContent = options.buttonText || 'Upload Files';
  uploadButton.addEventListener('click', () => fileInput.click());

  // Append elements to the body or a specific container
  document.body.appendChild(fileInput);
  document.body.appendChild(uploadButton);

  fileInput.addEventListener('change', async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    try {
      let folderName = 'Primary';
      if (files.length > 1) {
        folderName = await getNewFolderName(supabaseClient, folderBaseName);
      }

      const fileURLs = await uploadFiles(supabaseClient, files, bucketName, folderName);

      if (onUploadSuccess) {
        onUploadSuccess(fileURLs);
      }

      alert('Files uploaded successfully.');
    } catch (error) {
      console.error('Error uploading files:', error);
      if (onUploadError) {
        onUploadError(error);
      }
      alert(`Error uploading files: ${error.message}`);
    }
  });

  async function uploadFiles(supabaseClient, files, bucketName, folderName) {
    const uploadPromises = files.map(async (file) => {
      const timestamp = new Date();
      const formattedDate = `${(timestamp.getMonth() + 1).toString().padStart(2, '0')}${timestamp.getDate().toString().padStart(2, '0')}${timestamp.getFullYear().toString().slice(2)}-${timestamp.getHours().toString().padStart(2, '0')}${timestamp.getMinutes().toString().padStart(2, '0')}${timestamp.getSeconds().toString().padStart(2, '0')}`;
      const fileName = `${formattedDate}-${file.name}`;
      const filePath = `${folderName}/${fileName}`;

      const { data, error } = await supabaseClient.storage.from(bucketName).upload(filePath, file);
      if (error) throw error;

      const { data: urlData, error: urlError } = await supabaseClient.storage.from(bucketName).getPublicUrl(filePath);
      if (urlError) throw urlError;

      return urlData.publicUrl;
    });

    return await Promise.all(uploadPromises);
  }

  async function getNewFolderName(supabaseClient, baseFolderName) {
    let index = 0;
    let folderExists = true;

    while (folderExists) {
      index++;
      const folderName = `${baseFolderName}-${index}`;
      const { data, error } = await supabaseClient.storage.from('test').list(folderName);

      folderExists = !error && data && data.length > 0;
    }

    return `${baseFolderName}-${index}`;
  }
}
