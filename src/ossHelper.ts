import {
  S3Client,
  PutObjectCommand
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";


export interface S3UploadParams {
  bucket: string,
  // with trailing slash
  folder: string,
  key: string,
}

// Handles obtaining a temporary URL to upload a file to Amazon S3
export const getS3UploadURL = async (params: S3UploadParams) => {

  const S3 = new S3Client({
    region: "auto",
    endpoint: process.env.S3_USER_DATA_ENDPOINT,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
  });
  
  let presign = null
  try {
    presign = await getSignedUrl(S3, new PutObjectCommand({Bucket: params.bucket, Key: `${params.folder}${params.key}` }), { expiresIn: 3600 })
  } catch (e) {
    console.error(e)
  }
  return presign
}