import * as AFRAME from "aframe";
import * as THREE from "three";

AFRAME.registerComponent("arjs-webcam-texture", {
  init: function () {
    this.scene = this.el.sceneEl;
    this.texCamera = new THREE.OrthographicCamera(-1.0, 1.0, 1.0, -1.0, 0, 10);
    this.texScene = new THREE.Scene();

    this.scene.renderer.outputEncoding = THREE.LinearEncoding

    this.scene.renderer.autoClear = false;
    this.video = document.createElement("video");
    this.video.setAttribute("autoplay", true);
    this.video.setAttribute("playsinline", true);
    this.video.setAttribute("display", "none");
    this.video.setAttribute("pointer-events", "none");
    this.video.setAttribute("height", "1px");
    document.body.appendChild(this.video);
    this.geom = new THREE.PlaneBufferGeometry(2, 2);
    this.texture = new THREE.VideoTexture(this.video);
    this.material = new THREE.MeshBasicMaterial({ map: this.texture });
    const mesh = new THREE.Mesh(this.geom, this.material);
    this.texScene.add(mesh);
  },

  play: function () {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      const constraints = {
        audio : false,
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };
      navigator.mediaDevices
        .getUserMedia(constraints)
        .then((stream) => {
          this.video.srcObject = stream;
          this.video.play();
        })
        .catch((e) => {
          this.el.sceneEl.systems["arjs"]._displayErrorPopup(
            `Webcam error: ${e}`
          );
        });
    } else {
      this.el.sceneEl.systems["arjs"]._displayErrorPopup(
        "sorry - media devices API not supported"
      );
    }
  },

  tick: function () {
    this.scene.renderer.clear();
    this.scene.renderer.render(this.texScene, this.texCamera);
    this.scene.renderer.clearDepth();
  },

  pause: function () {
    this.video.srcObject.getTracks().forEach((track) => {
      track.stop();
    });
  },

  remove: function () {
    this.material.dispose();
    this.texture.dispose();
    this.geom.dispose();
  },
});
