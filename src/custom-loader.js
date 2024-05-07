export class CustomLoader {
  constructor() {
    this.gltfLoader = new THREE.GLTFLoader();
  }

  loadGLB(url) {
    return new Promise((resolve, reject) => {
      this.gltfLoader.load(
        url,
        (gltf) => {
          resolve(gltf);
        },
        undefined,
        (error) => {
          reject(error);
        }
      );
    });
  }

  loadImage(url) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        resolve(image);
      };
      image.onerror = () => {
        reject(new Error("Failed to load image."));
      };
      image.src = url;
    });
  }

  loadAsset(type, url) {
    if (type === 'glb') {
      return this.loadGLB(url);
    } else if (type === 'image') {
      return this.loadImage(url);
    } else {
      return Promise.reject(new Error("Unknown asset type."));
    }
  }
}
