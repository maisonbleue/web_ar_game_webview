var clickables = []



const raycaster = new THREE.Raycaster();
document.sceneClick = function(){
    var camera = document.getElementById('camera').components.camera.camera
    if(!camera || camera.type != "PerspectiveCamera") return console.error("The A-frame second camera doesnt exists and was expected to be the perspective THREE.Camera !")
    mouseVector.x =  (event.clientX / (window.innerWidth )) * 2 - 1;
    mouseVector.y = -(event.clientY / (window.innerHeight)) * 2 + 1;
    raycaster.setFromCamera(new THREE.Vector2(mouseVector.x, mouseVector.y), camera)

    for(var c = 0; c < clickables.length; c++){
        let element = clickables[c]
        var intersects = raycaster.intersectObject(element.object3D, true)
        if(intersects.length) {
            for(var i = 0; i < intersects.length; i++){
                if(element.onclick && element.onclick()) return;
            }
        }
    }
}


// ----- Extra code for handling PC mouses and not just touch events
var mouseVector = {}
function onDocumentMouseMove( event ) {
    mouseVector.x = (event.clientX / (window.innerWidth)) * 2 - 1;
    mouseVector.y = -(event.clientY / (window.innerHeight)) * 2 + 1;
}
document.addEventListener( 'mousemove', onDocumentMouseMove, false );
// -----


// Auto connect scene to click system
let repeatUntilSceneExist = setInterval(() => {
    var scene = document.getElementById("scene")
    if(scene){
        clearInterval(repeatUntilSceneExist);
        if(!scene.onClick) scene.addEventListener("click", document.sceneClick)
    }
}, 20)


// Add this to element we can click with this system
AFRAME.registerComponent('clickable', {
  init() {
    clickables.push(this.el)
  },

  remove(){
    const index = clickables.indexOf(this.el);
    if (index !== -1) {
      clickables.splice(index, 1);
    }
  }
})










document.worldify = function(node){
    let position = new THREE.Vector3()
    let quaternion = new THREE.Quaternion()
    let scale = new THREE.Vector3()
    node.matrixWorld.decompose(position, quaternion, scale)
    node.position.x = position.x
    node.position.y = position.y
    node.position.z = position.z
    node.quaternion.x = quaternion.x
    node.quaternion.y = quaternion.y
    node.quaternion.z = quaternion.z
    node.quaternion.w = quaternion.w
    node.scale.x = scale.x
    node.scale.y = scale.y
    node.scale.z = scale.z

    while(node.parent && node.parent.parent)
        node.parent = node.parent.parent
}