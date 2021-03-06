import * as AWS from "aws-sdk";
import axios, { AxiosRequestConfig  } from "axios";
import { FORTNITE_API_KEY, AWS_BUCKET } from "./config";

export interface IFetchFortniteApiParams {
  method: "GET"|"POST",
  url: string;
  body?: any;
}
export async function fetchFortniteAPi<T>(params: IFetchFortniteApiParams): Promise<T> {
  try {
    const { method, url, body } = params;
    const options: AxiosRequestConfig = {
      method: method,
      url: url,
      headers: {
        "AUthorization": FORTNITE_API_KEY,
        "Content-type": "Application/json"
      },
      data: body
    }
    const res = await axios(options);
    return res.data;
  } catch(err) {
    throw err;
  }
}

export async function putObjectToS3(key, data, contentType): Promise<AWS.S3.PutObjectOutput> {
    return new Promise((resolve, reject) => {
        const s3 = new AWS.S3();
        const params = {
            Bucket : AWS_BUCKET,
            Key : key,
            Body : data,
            ContentType: contentType
        };
        s3.putObject(params, function(err, data) {
            if(err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
}
