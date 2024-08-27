// uploader-v1.js

export function initializeUploader(supabaseClient, {
  bucketName,
  folderBaseName,
  inputFileId,
  uploadButtonId,
  onUploadSuccess,
  onUploadError,
}) {
  document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById(inputFileId);
    const uploadButton = document.getElementById(uploadButtonId);
    let files = [];
    let uploading = false;

    fileInput.addEventListener('change', async (event) => {
      files = Array.from(event.target.files);

      if (files.length > 0) {
        if (!uploading) {
          uploadButton.click(); // Automatically trigger the upload
        }
      }
    });

    uploadButton.addEventListener('click', async () => {
      if (uploading || files.length === 0) return;
      uploading = true;
      uploadButton.textContent = 'Uploading...';
      uploadButton.disabled = true;

      try {
        let folderName = folderBaseName;
        if (files.length > 1) {
          folderName = await getNewFolderName(supabaseClient, bucketName, folderBaseName);
        }

        const uploadPromises = files.map(async (file) => {
          const timestamp = new Date();
          const formattedDate = `${(timestamp.getMonth() + 1).toString().padStart(2, '0')}${timestamp.getDate().toString().padStart(2, '0')}${timestamp.getFullYear().toString().slice(2)}-${timestamp.getHours().toString().padStart(2, '0')}${timestamp.getMinutes().toString().padStart(2, '0')}${timestamp.getSeconds().toString().padStart(2, '0')}`;

          const fileName = `${formattedDate}-${file.name}`;
          const filePath = `${folderName}/${fileName}`;

          const { data, error } = await supabaseClient.storage
            .from(bucketName)
            .upload(filePath, file);

          if (error) {
            throw error;
          }

          const { data: urlData, error: urlError } = await supabaseClient.storage
            .from(bucketName)
            .getPublicUrl(filePath);

          if (urlError) {
            throw urlError;
          }

          return urlData.publicUrl;
        });

        const fileURLs = await Promise.all(uploadPromises);

        onUploadSuccess(fileURLs);
      } catch (error) {
        onUploadError(error);
      } finally {
        uploading = false;
        uploadButton.textContent = 'Upload';
        uploadButton.disabled = false;
        files = []; // Reset files array after upload
      }
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
  });
}
