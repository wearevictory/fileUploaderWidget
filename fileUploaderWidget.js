export function initializeUploader(supabaseClient, options) {
  const {
    bucketName,
    folderBaseName,
    fileInputId,
    uploadButtonId,
    fileDetailsContainerId,
    onUploadSuccess,
    onUploadError,
  } = options;

  const fileInput = document.getElementById(fileInputId);
  const uploadButton = document.getElementById(uploadButtonId);
  const fileDetailsContainer = document.getElementById(fileDetailsContainerId);

  let files = [];
  let uploading = false;

  fileInput.addEventListener('change', (event) => {
    files = Array.from(event.target.files);

    if (files.length > 0) {
      displayFileDetails(files, fileDetailsContainer);

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
      if (files.length > 1) {
        folderName = await getNewFolderName(supabaseClient, bucketName, folderBaseName);
      }

      const fileURLs = await uploadFiles(supabaseClient, bucketName, folderName, files);
      onUploadSuccess(fileURLs);
    } catch (error) {
      onUploadError(error);
    } finally {
      uploading = false;
      uploadButton.textContent = 'Upload';
      uploadButton.disabled = false;
    }
  });

  function displayFileDetails(files, container) {
    const fileNames = files.map(file => file.name).join(', ');
    const totalSize = files.reduce((acc, file) => acc + file.size, 0);
    container.innerHTML = `
      <p>Files: ${fileNames}</p>
      <p>Total Size: ${(totalSize / (1024 * 1024)).toFixed(2)} MB</p>
      <button id="removeButton">Remove</button>
    `;

    const removeButton = container.querySelector('#removeButton');
    removeButton.addEventListener('click', () => {
      fileInput.value = '';
      container.innerHTML = '';
      files = [];
    });
  }

  async function uploadFiles(supabaseClient, bucketName, folderName, files) {
    const uploadPromises = files.map(async (file) => {
      const timestamp = new Date();
      const formattedDate = `${(timestamp.getMonth() + 1).toString().padStart(2, '0')}${timestamp.getDate().toString().padStart(2, '0')}${timestamp.getFullYear().toString().slice(2)}-${timestamp.getHours().toString().padStart(2, '0')}${timestamp.getMinutes().toString().padStart(2, '0')}${timestamp.getSeconds().toString().padStart(2, '0')}`;

      const fileName = `${formattedDate}-${file.name}`;
      const filePath = `${folderName}/${fileName}`;

      const { data, error } = await supabaseClient.storage
        .from(bucketName)
        .upload(filePath, file);

      if (error) {
        throw new Error(`Error uploading ${file.name}: ${error.message}`);
      }

      const { data: urlData, error: urlError } = await supabaseClient.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      if (urlError) {
        throw new Error(`Error getting URL for ${file.name}: ${urlError.message}`);
      }

      return urlData.publicUrl;
    });

    return Promise.all(uploadPromises);
  }

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
