import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CloudinaryService {
  private readonly cloudName = 'ddfzttgyr';
  private readonly uploadPreset = 'tortas_unsigned';
  private readonly uploadUrl = `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`;

  constructor(private http: HttpClient) {}

  /**
   * Uploads a File object to Cloudinary using unsigned upload.
   * @param file The file to upload (selected via <input type="file">)
   * @returns Observable containing secure URL of uploaded image or null on error
   */
  uploadImage(file: File): Observable<string | null> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', this.uploadPreset);

    return this.http.post<any>(this.uploadUrl, formData).pipe(
      map(res => {
        if (res && res.secure_url) {
          console.log('Cloudinary uploaded URL:', res.secure_url);
          return res.secure_url as string;
        }
        return null;
      }),
      catchError(err => {
        console.error('=== CLOUDINARY UPLOAD FAILED ===', err);
        return of(null);
      })
    );
  }
}
