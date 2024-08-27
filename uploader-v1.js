export function initializeUploader(supabaseClient, options) {
  const { bucketName, folderBaseName, onUploadSuccess, onUploadError, fileInputId, uploadButtonId } = options;

  // Get the existing file input and upload button elements by ID
  const fileInput = document.getElementById(fileInputId);
  const uploadButton = document.getElementById(uploadButtonId);

  if (!fileInput) {
    console.error(`File input with ID ${fileInputId} not found.`);
    return;
  }

  if (!uploadButton) {
    console.error(`Upload button with ID ${uploadButtonId} not found.`);
    return;
  }

  // Attach change event listener to the file input
  fileInput.addEventListener('change', async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    try {
      let folderName = 'Primary';
      if (files.length > 1) {
        folderName = await getNewFolderName(supabaseClient, folderBaseName);
      }

      // Trigger the upload button click automatically
      uploadButton.click();

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

  // Attach click event listener to the upload button
  uploadButton.addEventListener('click', async () => {
    if (fileInput.files.length === 0) {
      console.error('No files selected.');
      return;
    }

    try {
      let folderName = 'Primary';
      if (fileInput.files.length > 1) {
        folderName = await getNewFolderName(supabaseClient, folderBaseName);
      }

      const files = Array.from(fileInput.files);
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

  async function getNewFolderName(supabaseClient, folderBaseName) {
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

  async function uploadFiles(supabaseClient, files, bucketName, folderName) {
    const uploadPromises = files.map(async (file) => {
      const timestamp = new Date();
      const formattedDate = `${(timestamp.getMonth() + 1).toString().padStart(2, '0')}${timestamp.getDate().toString().padStart(2, '0')}${timestamp.getFullYear().toString().slice(2)}-${timestamp.getHours().toString().padStart(2, '0')}${timestamp.getMinutes().toString().padStart(2, '0')}${timestamp.getSeconds().toString().padStart(2, '0')}`;
      const fileName = `${formattedDate}-${file.name}`;
      const filePath = `${folderName}/${fileName}`;

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

    return Promise.all(uploadPromises);
  }
}
