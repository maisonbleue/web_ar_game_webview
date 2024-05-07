import GUI from '8gui'
import AFRAME from "aframe"
import './lighttrail.js'

// import { CustomLoader } from "./custom-loader.js"

import "aframe-extras"

import "./sceneclick.js"
import "./speed.js"

// import "./arjs-look-controls"
import "./arjs-webcam-texture"

import "./tutorial-manager.js"
import { set } from 'animejs'

console.log("-___ Starting Main ___-")

var score = 0
var scoreAnim
var maxTime = 40000 // ms
var timerAnim

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString)
const storeParam = JSON.parse(urlParams.get('inStore'))
var inStore = storeParam != undefined ? storeParam : false; // Debug : On peut changer ici la valeur par défaut du mode magasin

const replayParam = JSON.parse(urlParams.get('replay'))
var replay = replayParam != undefined ? replayParam : false; // Debug : On peut changer ici la valeur par défaut du replay

function get(id) { return document.getElementById(id)}

setTimeout(function(){
	// var gui = GUI.inspect(document.getElementById("scene"))

}, 1000)

var countdown
document.startGame = function() {
	console.log("Starting game")
	var tutoWrapper = document.getElementById("tutorial-wrapper")
	if(tutoWrapper) tutoWrapper.remove()

	document.getElementById("scene2d").style.display = "flex"
	document.getElementById("scene").setAttribute('visible', 'true');
	document.getElementById("partners-logos").classList.add('bottom')

	document.getElementById("countdownSound").currentTime = 0
	document.getElementById("countdownSound").play()

	countdown = AFRAME.ANIME({
    duration: 1000,
    loop: 3,
    easing: 'easeInOutCirc',
    loopBegin: function(anim) {
      document.getElementById('countdown-text').innerHTML = anim.remaining
    },
    complete: function(anim) {
      document.getElementById('countdown-text').innerHTML = 'Go !'

      AFRAME.ANIME({
		    duration: 1000, loop: false, easing: 'easeInOutCirc',
		    update: function(anim) {
		      document.getElementById('countdown-text').style.opacity = 1.0 - anim.progress / 100.0
		    },
		    complete: function(anim) {
		      document.getElementById('countdown-text').innerHTML = ''
		      document.getElementById('countdown-text').style.opacity = 1.0
			  document.getElementById('game-canon').firstShotTime = undefined;
			  document.getElementById('game-canon').shotDone = 0;
			  document.getElementById('game-canon').gameOver = false;
		    }
		  });

      document.getElementById("musicSound").currentTime = 0
	  document.getElementById("musicSound").play()
	  document.getElementById("endSound").currentTime = 0
	  document.getElementById("endSound").play()

	  var canonAttribute = document.getElementById('game-canon').getAttribute("canon")
	  if (!canonAttribute) {
		document.getElementById('game-canon').setAttribute("canon", "timer:true")
	  }

    }
  });
}

document.restartGame = () => {
	document.getElementById("end-screen").style.display = "none"
	score = 0

	let scoreDiv = document.getElementById("scorediv")
	scorediv.innerHTML = `0 pts`

	// var scoreAnim
	if (scoreAnim) scoreAnim.restart()
	maxTime = 40000 // ms

	// var timerAnim
	if (timerAnim) timerAnim.restart()
	let timerdiv = document.getElementById('timerdiv')
	timerdiv.innerHTML = "00:" + (((maxTime / 1000) < 10) ? '0' : '') + (maxTime / 1000) + "s"
	countdown.restart()
	document.startGame()
}

AFRAME.registerComponent('canon', {
	schema: {
	    timer: {type: 'boolean', default: false}
	},
  init() {
  	var canon = this.el
  	canon.shotDone = 0
  	canon.currentAmmoIndex = 0
  	canon.shoot = function(){
		if(canon.gameOver) return;
  		if(canon.currentAmmoIndex !== undefined){
  			canon.shotDone++
  			var element
  			if(canon.currentAmmoIndex == -1){
  				element = canon.currentAmmo
  			}
	  		else element = canon.object3D.children[canon.currentAmmoIndex].el
			if(!element) return;

			var object = element.object3D
			if(object.preventShoot) return;

			document.quicksave(object)

			object.preventShoot = true
			document.worldify(object)

			var matrixWorld = element.sceneEl.camera.matrixWorld
			const vec = new THREE.Vector3(
				-matrixWorld.elements[8] + matrixWorld.elements[4],
				-matrixWorld.elements[9] + matrixWorld.elements[5],
				-matrixWorld.elements[10]+ matrixWorld.elements[6]
			).normalize()

			document.getElementById("shotSound").currentTime = 0
			document.getElementById("shotSound").play()

			let force = 4.0

			object.speed.x = force * 1000 / object.mass * vec.x
			object.speed.y = force * 1000 / object.mass * vec.y
			object.speed.z = force * 1000 / object.mass * vec.z

			element.setAttribute("gravity", "")

			let tubeRadius
			if(element.getAttribute("trailRadius")) tubeRadius = element.getAttribute("trailRadius")
			element.setAttribute("lighttrail", tubeRadius ? "tubeRadius: " + tubeRadius + ";" : "")

			element.object3D.notSelectable = true
			if(element.object3D.soundOnShot){
				element.object3D.soundOnShot.currentTime = 0
				// element.object3D.soundOnShot.play()
			}

			element.setAttribute("ammo", "")
			element.onFloorHit = function(){
				element.onFloorHit = undefined
				//document.impact(element.object3D.matrixWorld.elements[12], element.object3D.matrixWorld.elements[14])
				// console.log("Ammo has hit the floor.")
				element.removeAttribute("ammo")
				element.removeAttribute("gravity")
				element.removeAttribute("lighttrail")
				object.speed.x = 0
				object.speed.y = 0
				object.speed.z = 0
				element.canHit = true
				object.reload()
				object.scale.x = 0
				object.scale.y = 0
				object.scale.z = 0
				element.object3D.notSelectable = false
				if(canon.currentAmmoIndex === undefined){
					canon.currentAmmo = object
					canon.currentAmmoIndex = -1
				}
			}
		}

		var nextIndex = Math.floor(Math.random() * canon.object3D.children.length)
		var tries = 1000
		while(tries-- > 0 && (canon.object3D.children[nextIndex].notSelectable)) // Should prevent choosing an ammo still flying
			nextIndex = Math.floor(Math.random() * canon.object3D.children.length)
		var nextAmmo = canon.object3D.children[nextIndex]
		if(nextAmmo){
			selectAmmo(nextAmmo)
			canon.currentAmmoIndex = nextIndex
		}
		else {
			canon.currentAmmoIndex = undefined
		}
		
		return true // prevent click to propagate further
  	}
  },
  tick(t,dt){
  	if(this.data.timer){
	  	if(this.el.shotDone == 0 && this.el.firstShotTime === undefined){
	  		this.el.firstShotTime = t
	  		this.el.almostFinishedSoundHasStarted = false
	  	}
	  	if(this.el.firstShotTime){
	  		let secondsLeft = Math.round((maxTime + this.el.firstShotTime - t) / 1000.0)
	  		let timerdiv = document.getElementById('timerdiv')
				try {
					if(!this.el.almostFinishedSoundHasStarted && secondsLeft < 6.048){
						document.getElementById("beforeEndSound").currentTime = 0
						document.getElementById("beforeEndSound").play()
						this.el.almostFinishedSoundHasStarted = true
					}

					if(secondsLeft < 0){
						timerdiv.innerHTML = "--:--s"
					}
					else timerdiv.innerHTML = "00:" + ((secondsLeft < 10) ? '0' : '') + secondsLeft + "s"

					if(!this.el.gameOver && secondsLeft <= 0){
						this.el.gameOver = true
						document.getElementById("endSound").currentTime = 0
						document.getElementById("endSound").play()

						document.getElementById("musicSound").pause()
						document.getElementById("musicSound").currentTime = 0
						sendScoreToClient(score)
					}
					
				} catch (error) {
					console.log(error)
				}

	  	}
	  }
  }
})

function selectAmmo(nextAmmo){
	nextAmmo.preventShoot = true

	let nextAmmoScaleAnim = AFRAME.ANIME({
		easing: 'linear',
		duration: 400,
		delay: 300,
		loop: false,
		update: function(anim) {
		    nextAmmo.scale.x = 1.6 * anim.progress / 100.0
		    nextAmmo.scale.y = nextAmmo.scale.x
		    nextAmmo.scale.z = nextAmmo.scale.x
		},
        complete: function(){
        	nextAmmo.preventShoot = false;
        }
	})
}

var ammoTargets = {}
AFRAME.registerComponent('ammo-target', {
	schema : {
		points: {type: 'int', default: 0},
		extraseconds: {type: 'int', default: 0}
	},
	init() {
		if(!ammoTargets[this.el.sceneEl.id])
			ammoTargets[this.el.sceneEl.id] = []
		ammoTargets[this.el.sceneEl.id].push(this.el.object3D)
		this.el.object3D.points = this.data.points
		this.el.object3D.extraseconds = this.data.extraseconds
	},
	remove() {
		const index = ammoTargets[this.el.sceneEl.id].indexOf(this.el.object3D);
		if (index !== -1) {
		  ammoTargets[this.el.sceneEl.id].splice(index, 1);
		}
	}
})

AFRAME.registerComponent('ammo', {
	schema: {
		
	},
  init() {

  },
  tick(t, dt) {
  	// Reaction on hitting ground
		try {
			if(this.el.object3D.matrixWorld.elements[13] < document.getElementById('floor').object3D.matrixWorld.elements[13]){
				if(this.el.onFloorHit) return this.el.onFloorHit()
			}
		} catch (error) {
			console.log(error)
		}

		if(this.el.canHit === false) return;

  	for(let targetIndex in ammoTargets[this.el.sceneEl.id]){
  		let target = ammoTargets[this.el.sceneEl.id][targetIndex]
  		if(target.hitAnim || target.preventCollision){

  		}
  		else {
  			let pos = computeLocalPos(target, this.el.object3D) // devrait représenter ou est la balle par rapport au ring
	  		let distanceXY = Math.sqrt(pos.x*pos.x + pos.y*pos.y)
	  		if(distanceXY == 0){
	  			continue;
	  		}
	  		if(pos.z > 0.02 + this.el.components.speed.data.radius) continue;

	  		this.el.canHit = false

	  		if(distanceXY > 0.85 - this.el.components.speed.data.radius){
	  			
	  			if(distanceXY < 0.85 + 3 * this.el.components.speed.data.radius) {
	  				bounce(target, this.el.object3D)

	  				let impactPosition = new THREE.Vector3()
						this.el.object3D.getWorldPosition(impactPosition)
						document.spawnParticle(target.el.sceneEl, impactPosition, 2.0, "crossBoldFile", 0.2, 0.2)
	  			}
	  		}
	  		else {
	  			if(target.points || target.extraseconds) {
	  				target.preventCollision = true
	  			}

	  			if(target.hitAnim) target.hitAnim.reset()

	  			let impactPosition = new THREE.Vector3()
					this.el.object3D.getWorldPosition(impactPosition)
					document.spawnParticle(target.el.sceneEl, impactPosition, 2.0, "touchPointFile", 0.2, 0.2)

					document.getElementById("hitSound").currentTime = 0
					document.getElementById("hitSound").play()

					if(target.points) {
						score += target.points

						let scoreDiv = document.getElementById("scorediv")
						let scorechange = document.getElementById("scorechange")
						var highlight = {radius: 0}
						AFRAME.ANIME({
								targets: highlight,
								radius: 0.8,
								duration: 600,
								direction: 'alternate',
								easing: 'easeInOutQuad',
								value: ['0.0vw', '0.8vw'],
								update: function(anim) {
									scoreDiv.style.filter = `drop-shadow(0 0 ${highlight.radius}vw #ffcb00)`
									scorechange.style.filter = `drop-shadow(0 0 ${highlight.radius}vw #ffcb00)`
								}
						})

						scorediv.innerHTML = `${score} pts`
						scorechange.innerHTML = "+ " + target.points

						if(scoreAnim) scoreAnim.reset()
						scoreAnim = AFRAME.ANIME({
							easing: 'linear', delay: 0, duration: 2000, loop: false,
							update: function(anim) {scorechange.style.opacity = 1.0 - anim.progress / 100.0},
							complete: function(anim) {scorechange.innerHTML = ""}
						})
					}

					if(target.extraseconds) {
						maxTime += target.extraseconds * 1000

						let timerdiv = document.getElementById("timerdiv")
						let timerchange = document.getElementById("timerchange")
						var highlight = {radius: 0}
						AFRAME.ANIME({
								targets: highlight,
								radius: 0.8,
								duration: 600,
								direction: 'alternate',
								easing: 'easeInOutQuad',
								value: ['0.0vw', '0.8vw'],
								update: function(anim) {
									timerdiv.style.filter = `drop-shadow(0 0 ${highlight.radius}vw #ffcb00)`
									timerchange.style.filter = `drop-shadow(0 0 ${highlight.radius}vw #ffcb00)`
								}
						})

						timerchange.innerHTML = "+ " + target.extraseconds

						if(timerAnim) timerAnim.reset()
						timerAnim = AFRAME.ANIME({
							easing: 'linear', delay: 0, duration: 2000, loop: false,
							update: function(anim) {timerchange.style.opacity = 1.0 - anim.progress / 100.0},
							complete: function(anim) {timerchange.innerHTML = ""}
						})
					}
					hitTarget(target)
	  		}
  		}
  	}
  }
})

function hitTarget(target){
	if(!target || !target.el) return;
	
	let ringWave
	var parent = target.parent
	parent.traverse(node => {
		if(node.el.hasAttribute('wave')){
			ringWave = node
		}
	})

	target.el.removeAttribute('animation-mixer')
	target.el.setAttribute('animation-mixer', 'clip: *; loop: once;')

	if(target.hitAnim) target.hitAnim.reset()
	let hitAnim = AFRAME.ANIME({
        duration: 2000,
        loop: false,
        easing: 'linear',
        update: function(anim){
        	let progress = anim.progress / 100.0
        	if(ringWave){
        		progress *= 3.0
        		ringWave.scale.x = 6.0 * progress
        		ringWave.scale.y = ringWave.scale.x
        		ringWave.scale.z = ringWave.scale.x
        		ringWave.traverse(n => {
        			if(n.material) n.material.opacity = 1.0 - progress
        		})
        	}
        	else console.warn("No ring wave ?")
        	if(target && target.el && target.el.sceneEl && target.el.sceneEl.id == 'scene'){
	        	target.el.object3D.traverse(n => {
	    			if(n.material) {
	    				n.material.transparent = true
	    				n.material.opacity = 1.0 - progress
	    			}
	    		})
	        }
        },
        complete: function() {
        	try {
	        	if(target && target.el && target.el.sceneEl && target.el.sceneEl.id == 'scene'){
	        		if(target.el.parentNode.parentNode.spawnAnother)
	        			target.el.parentNode.parentNode.spawnAnother()
	        		target.el.parentNode.parentNode.parentNode.removeChild(target.el.parentNode.parentNode);
	        	}
	        } catch(e) {
	        	if(target && target.el)
	            	target.el.removeAttribute('animation-mixer')
	           
	        } finally {
	        	target.hitAnim = undefined
	        }
        }
    })

	target.hitAnim = hitAnim
}



document.requestCameraAndOrientation = function(){
	// Doit injecter les compos arjs-webcam-texture dans la scene et arjs-look-controls dans la camera et cacher le menu d'acceuil
	var scene  = document.getElementById("scene")
	var camera = document.getElementById("camera")

	try {
		// scene.removeAttribute('device-orientation-permission-ui')
		// scene.setAttribute('device-orientation-permission-ui', 'enabled: true')
		scene.setAttribute('arjs-webcam-texture', {})
		// camera.setAttribute('arjs-look-controls', {})
	} catch (error) {
		console.log(error)
	}
}

var continueToEndMenu = function(){
}

AFRAME.registerComponent('speed_rotation', {
	schema: {
	    x: {type: 'float', default: 0.0}, // Radians per minute
	    y: {type: 'float', default: 0.0}, // Radians per minute
	    z: {type: 'float', default: 0.0}, // Radians per minute
	},
	tick(t, dt) {
		if(!(this.el && this.el.object3D)) return;
		this.el.object3D.rotation.x += this.data.x * dt / 60000.0 * (1.0 + score / 300.0)
		this.el.object3D.rotation.y += this.data.y * dt / 60000.0 * (1.0 + score / 300.0)
		this.el.object3D.rotation.z += this.data.z * dt / 60000.0 * (1.0 + score / 300.0)
	}
})



AFRAME.registerComponent('sound-on-shot', {
	schema: {
	    id: {type: 'string', default: ''}
	},
	init(){
		this.el.object3D.soundOnShot = document.getElementById(this.data.id)
	}
})

AFRAME.registerComponent('levitating', {
	schema: {
	    height: {type: 'float', default: 0.5},
	    frequency:{type: 'float', default: 0.5}
	},
	init() {
	  	this.el.object3D.position.y = Math.random() * this.data.height
	  	this.timeOffset = 10.0 * Math.random()
	},
	tick(t, dt) {
		if(!(this.el && this.el.object3D)) return;
		if(!this.startY) this.startY = this.el.object3D.position.y
	    this.el.object3D.position.y = this.startY + this.data.height * Math.sin(t / 1000.0 * this.data.frequency + this.timeOffset)
	}
})

AFRAME.registerComponent('random_z_rotation', {
  init() {
    this.el.object3D.rotation.z = 10.0 * Math.random()
  }
})

document.shootPreview = function(element){
	let canon = document.getElementById("preview-canon")
	if(canon) return canon.shoot()
	return false
}

document.shoot = function(element){
	let canon = document.getElementById("game-canon")
	if(canon && canon.shoot) {
		return canon.shoot()
	}
	return false
}

document.quicksave = function(node){
	let saved_position = new THREE.Vector3()
    let saved_quaternion = new THREE.Quaternion()
    let saved_scale = new THREE.Vector3()
    let saved_parent = node.parent
    node.matrix.decompose(saved_position, saved_quaternion, saved_scale)

    node.reload = function(){
    	node.parent = saved_parent
    	node.position.x = saved_position.x
	    node.position.y = saved_position.y
	    node.position.z = saved_position.z
	    node.quaternion.x = saved_quaternion.x
	    node.quaternion.y = saved_quaternion.y
	    node.quaternion.z = saved_quaternion.z
	    node.quaternion.w = saved_quaternion.w
	    node.scale.x = saved_scale.x
	    node.scale.y = saved_scale.y
	    node.scale.z = saved_scale.z
    }
}


// Allows the auto run of every animations at normal speed stored in an a-entity.
AFRAME.registerComponent('gltf-material-srgb', {
	schema : {type: 'string', default: ""},
	init() {
		this.el.object3D.traverse(node => {
	    	if(node.material && node.material.map) {
	    		if(this.data != '') node.material.map.image = document.getElementById(this.data)
	    		node.material.map.encoding = THREE.sRGBEncoding
	    		this.tick = ()=>{}
	    	}
	    })
	},
	tick(t,dt){
		this.init()
	}
})

// Allows the auto run of every animations at normal speed stored in an a-entity.
AFRAME.registerComponent('gltf-material-linear', {
	schema : {type: 'string', default: ""},
	init() {
		this.el.object3D.traverse(node => {
	    	if(node.material && node.material.map) {
	    		if(this.data != '') node.material.map.image = document.getElementById(this.data)
	    		node.material.map.encoding = THREE.LinearEncoding
	    		this.tick = ()=>{}
	    	}
	    })
	},
	tick(t,dt){
		this.init()
	}
})

// Flush itself if not in store
AFRAME.registerComponent('store-only', {
	init() {
		if(!inStore) {
			this.el.object3D.notSelectable = true
			this.el.innerHTML = ""
		}

	}
})

// Flush itself if not in store
AFRAME.registerComponent('rotation-balance-y', {
	tick(t, dt) {
		if(t > (this.lastChecktime || 0) + 1000){
			this.lastChecktime = t
			let children = this.el.object3D.children
			let visibleChildren = []
			for(let i = 0; i < children.length; i++){
				if(children[i].visible){
					let empty = true
					children[i].traverse(node => {
						if(node.isMesh) empty = false
					})
					if(!empty)
						visibleChildren.push(children[i])
				}
			}
			for(let i = 0; i < visibleChildren.length; i++){
				visibleChildren[i].rotation.y = i * 2.0 * Math.PI / visibleChildren.length
			}
		}
	}
})

function sendScoreToClient(finalScore){
	setTimeout(function(){
		document.getElementById('end-screen').style.display = "block"
		document.getElementById('result-score').innerHTML = `${finalScore}`
	}, 3000)

	try {
		if(window.Android){
			Android.scoreEvent(finalScore);
		} else {
			if(window.webkit){
				window.webkit.messageHandlers.scoreEvent.postMessage(finalScore);
			}
			else {
				console.error("Not Android, no webkit --> no score solution.")
			}
		}
	}
	catch(e) {
		console.error(e)
	}
}


AFRAME.registerComponent('skip-on-replay', {
	init() {
		if(replay) {
			this.el.object3D.visible = false
			document.requestCameraAndOrientation()
			document.startGame()
		}
	}
})

function findMostSpacedRadialInterval(angles) {
  // Sort the angles in ascending order
  angles.sort((a, b) => a - b);

  let maxInterval = -Infinity;
  let maxIntervalIndex = -1;

  // Calculate the differences between consecutive angles
  for (let i = 0; i < angles.length - 1; i++) {
    const interval = angles[i + 1] - angles[i];
    if (interval > maxInterval) {
      maxInterval = interval;
      maxIntervalIndex = i;
    }
  }

  if (maxIntervalIndex === -1) {
    return null; // No valid intervals found
  }

  // Calculate the midpoint of the most spaced interval
  const mostSpacedIntervalMidpoint = (angles[maxIntervalIndex] + angles[maxIntervalIndex + 1]) / 2;

  return mostSpacedIntervalMidpoint;
}

function findBestAngle(){
	let angles = [0.0]
	let rings = document.getElementById('rings')
	if(rings){
		rings = rings.object3D.children
		for(var i = 0; i < rings.length; i++){
			let ring = rings[i]
			angles.push(ring.rotation.y)
		}
		angles.push(2 * Math.PI)
		let bestAngle = findMostSpacedRadialInterval(angles)
		if(bestAngle == 0) return Math.random() * 360
		else return bestAngle * 180.0 / Math.PI;
	}
	return Math.random() * 360
}

function addTo(element, html) {
  var template = document.createElement('template')
  html = html.trim() // Never return a text node of whitespace as the result
  template.innerHTML = html
  return element.appendChild(template.content.firstChild)
}

document.addRing = function(element, subtemplate, scale){
	let angle = findBestAngle()
	let height = 0.8// + 0.5 * Math.random()
	let frequency = 0.4 + 0.2 * Math.random()
	let distance = -2.5
	let template = `
		<a-entity rotation="0 ${angle} 0">
          <a-entity position="0 ${height} ${distance}" scale="${scale} ${scale} ${scale}" rotation="0 0 0">
            ${subtemplate}
          </a-entity>
        </a-entity>
  `
  var newElement
  if(element) newElement = addTo(element, template)
  else newElement = addTo(document.getElementById('rings'), template)
	newElement.spawnAnother = function(){
		document.addRing(element, subtemplate, scale)
	}
}

document.spawnParticle = function(node, position, duration, imgId, width, height){
	let template = `
    <a-plane particle="t:${duration};" position="${position.x} ${position.y} ${position.z}" width="${width}" height="${height}" material="src:#${imgId}; transparent: true; depthWrite:false; depthTest:false; opacity:1.0;"></a-plane>
  `
  let particule = addTo(node, template)
}

document.addBronzeRing = function(element){
	document.addRing(element, `
		<a-entity ammo-target="points:10;" scalein gltf-model="#ring" gltf-material-linear="ringBronzeSurfaceColorPNG"></a-entity>
        <a-plane wave material="src:#waveBronzeImage; transparent: true; depthWrite:false; opacity:0.0;"></a-plane>
    `, "0.5")
}

document.addSilverRing = function(element){
	document.addRing(element, `
		<a-entity ammo-target="points:20;" scalein gltf-model="#ring" gltf-material-linear="ringArgentSurfaceColorPNG"></a-entity>
        <a-plane wave material="src:#waveSilverImage; transparent: true; depthWrite:false; opacity:0.0;"></a-plane>
    `, "0.3")
}

document.addGoldRing = function(element){
	document.addRing(element, `
		<a-entity ammo-target="points:30;" scalein gltf-model="#ring" gltf-material-linear="ringGoldSurfaceColorPNG"></a-entity>
        <a-plane wave material="src:#waveGoldImage; transparent: true; depthWrite:false; opacity:0.0;"></a-plane>
    `, "0.2")
}

document.addSpecialRing = function(element){
	document.addRing(element, `
		<a-entity ammo-target="extraseconds:3;" scalein gltf-model="#ring" gltf-material-linear="ringSpecialSurfaceColorPNG"></a-entity>
        <a-plane wave material="src:#waveSpecialImage; transparent: true; depthWrite:false; opacity:0.0;"></a-plane>
    `, "0.2")
}

AFRAME.registerComponent('ring-spawner', {
	init() {
		let spawnFunctions = [ 
			document.addBronzeRing,
			document.addBronzeRing,
			document.addBronzeRing,
			document.addSilverRing,
			document.addSilverRing,
			document.addGoldRing,
			function(){if(inStore) document.addSpecialRing()}
		]

		let spawnSequence = AFRAME.ANIME({
			duration: 200,
			loop: true,
			loopBegin : function(){
				if(spawnFunctions.length) spawnFunctions.shift()()
				else {
					spawnSequence.pause()
				}
			}
		})
	}
})

AFRAME.registerComponent('scalein', {
	schema: {
	    x: {type: 'float', default: 1.0},
	    y: {type: 'float', default: 1.0},
	    z: {type: 'float', default: 1.0},
	    t: {type: 'float', default: 500} // ms
	},
	init() {
		let that = this
		let node = this.el.object3D
		node.scale.x = 0
		node.scale.y = 0
		node.scale.z = 0
		let spawnSequence = AFRAME.ANIME({
			duration: that.data.t,
			loop: false,
			update : function(anim){
				let progress = anim.progress / 100.0
				node.scale.x =  progress * that.data.x
				node.scale.y =  progress * that.data.y
				node.scale.z =  progress * that.data.z
			}
		})
	}
})

AFRAME.registerComponent('particle', {
	schema: {
	    t: {type: 'float', default: 1.0},
	},
	init() {
		let that = this
		let node = this.el.object3D

		AFRAME.ANIME({
			duration: that.data.t * 1000.0,
			loop: false,
			update : function(anim){
				let progress = anim.progress / 100.0
				node.traverse(n => {
					if(n.material) {
						n.material.opacity = 1.0 - anim.progress / 100.0
					}
				})
			},
			complete : (anim) => {
				this.el.remove()
			}
		})
	},

	tick(t,dt){
		const target = new THREE.Vector3(0, 0, 0);
		const direction = new THREE.Vector3();
		let position = new THREE.Vector3();
		this.el.object3D.getWorldPosition(position)
	  direction.subVectors(target, position).normalize();
	  const quaternion = new THREE.Quaternion();
	  quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
	  this.el.object3D.setRotationFromQuaternion(quaternion);
	}
})

function computeLocalPos(firstNode, secondNode) {
	let secondNodeCopy = new THREE.Object3D();
	secondNodeCopy.copy(secondNode, false);
	firstNode.attach(secondNodeCopy);
	secondNodeCopy.updateMatrix(true);
	let pos = new THREE.Vector3();
	pos = secondNodeCopy.position.clone();
	firstNode.remove(secondNodeCopy);
  return pos;
}

function bounce(ring, ammo) {
	let ammoSpeedNode = new THREE.Object3D();
	ammoSpeedNode.position.x = ammo.speed.x
	ammoSpeedNode.position.y = ammo.speed.y
	ammoSpeedNode.position.z = ammo.speed.z
	ring.attach(ammoSpeedNode)
	ammoSpeedNode.updateMatrix(true);
	ammoSpeedNode.position.x *= 0.8;
	ammoSpeedNode.position.y *= 0.8;
	ammoSpeedNode.position.z *=-0.8;
	ammoSpeedNode.updateMatrix(true);
	ammo.parent.attach(ammoSpeedNode);
	ammoSpeedNode.updateMatrix(true);
	ammo.speed.x = ammoSpeedNode.position.x
	ammo.speed.y = ammoSpeedNode.position.y
	ammo.speed.z = ammoSpeedNode.position.z
	ammo.parent.remove(ammoSpeedNode);
}
