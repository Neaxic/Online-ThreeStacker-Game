import * as Socket from '/node_modules/socket.io/client-dist/socket.io.js';
import * as THREE from '/node_modules/three/build/three.module.js';

var socket = io();

let camera, scene, renderer, world;
let gameStarted = false;
let gameEnded = false;
let stack = [];
let oppStack = [];
let lastTime;
let overhangs = [];
let playerID;
const boxHeight = 1;
const originalBoxSize = 3;

// TODO: REMEBER TO MAKE THIS FALSE ON GAME RESTART WHEN BUTTN IS ADDED
// RN JUST RELOAD.
var checkOutOfBounds = false;

window.addEventListener("click", () => {
  if(!gameStarted || gameEnded){
    socket.emit('playerRdy', {
      id: playerID,
    });
  } else {
    gameSTART();
    //oppSTART();
    socket.emit('Click');
    } 
})

function gameSTART(){
    const topLayer = stack[stack.length -1];
    const previousLayer = stack[stack.length-2];

    const direction = topLayer.direction;

    const delta =
      topLayer.threejs.position[direction] -
      previousLayer.threejs.position[direction];

    const overhangSize = Math.abs(delta);

    const size = direction == "x" ? topLayer.width : topLayer.depth;

    const overlap = size - overhangSize;

    if(overlap > 0){
      cutBox(topLayer, overlap, size, delta);
      
      //Overhang
      const overhangShift = (overlap / 2 + overhangSize / 2) * Math.sign(delta);
      const overhangX = direction == "x"
        ? topLayer.threejs.position.x + overhangShift
        : topLayer.threejs.position.x;
      const overhangZ = direction == "z"
        ? topLayer.threejs.position.z + overhangShift
        : topLayer.threejs.position.z;
      const overhangWidth = direction == "x" ? overhangSize : topLayer.width;
      const overhangDepth = direction == "z" ? overhangSize : topLayer.depth;

      addOverHang(overhangX, overhangZ, overhangWidth, overhangDepth, 1);

      const nextX = direction == "x" ? topLayer.threejs.position.x : -10;
      const nextZ = direction == "z" ? topLayer.threejs.position.z : -10;
      const nextDirection = direction == "x" ? "z" : "x";
  
      addLayer(nextX, nextZ, topLayer.width, topLayer.depth, nextDirection);

      document.getElementById("score").innerText = "Score: " +stack.length;
    }else {
      missedBlock();
    }
} 

function oppSTART(){
  const topLayer = oppStack[oppStack.length -1];
  const previousLayer = oppStack[oppStack.length-2];

  const direction = topLayer.direction;

  const delta =
    topLayer.threejs.position[direction] -
    previousLayer.threejs.position[direction];

  const overhangSize = Math.abs(delta);

  const size = direction == "x" ? topLayer.width : topLayer.depth;

  const overlap = size - overhangSize;

  if(overlap > 0){
    cutBox(topLayer, overlap, size, delta);
    
    //Overhang
    const overhangShift = (overlap / 2 + overhangSize / 2) * Math.sign(delta);
    const overhangX = direction == "x"
      ? topLayer.threejs.position.x + overhangShift
      : topLayer.threejs.position.x;
    const overhangZ = direction == "z"
      ? topLayer.threejs.position.z + overhangShift
      : topLayer.threejs.position.z;
    const overhangWidth = direction == "x" ? overhangSize : topLayer.width;
    const overhangDepth = direction == "z" ? overhangSize : topLayer.depth;

    addOverHang(overhangX, overhangZ, overhangWidth, overhangDepth, 2);

    const nextX = direction == "x" ? topLayer.threejs.position.x : -6;
    const nextZ = direction == "z" ? topLayer.threejs.position.z : -14;
    const nextDirection = direction == "x" ? "z" : "x";

    OppaddLayer(nextX, nextZ, topLayer.width, topLayer.depth, nextDirection);

  }else {
    oppmissedBlock();
  }
} 



function gameOverAnimation(){
  scene.background = new THREE.Color(0xf52f22);
  scene.fog = new THREE.Fog((new THREE.Color('red')), 1, 10);
  document.getElementById("GameoverH1").innerText = "Gameover!"
  document.getElementById("GameoverP").innerText = ("Your final score was: " + (stack.length));
  gameEnded = true;
}

function gameWinAnimation(){
  scene.background = new THREE.Color(0x42f572);
  scene.fog = new THREE.Fog((new THREE.Color('green')), 1, 10);
  document.getElementById("GameoverH1").innerText = "CONGRATULATIONS, YOU WON!"
  document.getElementById("GameoverP").innerText = ("Your final score was: " + (stack.length));
  gameEnded = true;
}

function missedBlock(){
  const topLayer = stack[stack.length-1];
  addOverHang(topLayer.threejs.position.x, topLayer.threejs.position.z, topLayer.width, topLayer.depth, 1);
  world.remove(topLayer.cannonjs);
  scene.remove(topLayer.threejs);

  socket.emit('Fail', {
    id: playerID,
    s: stack.length-1,
  });
}

function oppmissedBlock(){
  const topLayer = oppStack[oppStack.length-1];
  addOverHang(topLayer.threejs.position.x, topLayer.threejs.position.z, topLayer.width, topLayer.depth, 2);
  world.remove(topLayer.cannonjs);
  scene.remove(topLayer.threejs);
}

function init() {

  world = new CANNON.World();
  world.gravity.set(0, -10, 0);
  world.borderphase = new CANNON.NaiveBroadphase();
  world.solver.iterations = 40;

  scene = new THREE.Scene();

  //one on origial:
  addLayer(-2,2,originalBoxSize, originalBoxSize);
  //The gliding one:
  addLayer(-10,2,originalBoxSize,originalBoxSize, "x");

  //one on origial:
  OppaddLayer(2,-2,originalBoxSize, originalBoxSize);
  OppaddLayer(-6,-2,originalBoxSize, originalBoxSize, "x");

  const geometry = new THREE.BoxGeometry(3,1,3);
  const material = new THREE.MeshLambertMaterial({color: 0xfb8e00});
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(-2,0,2);
  scene.add(mesh);

  const materialOnline = new THREE.MeshLambertMaterial({color: 0x00cdfb});
  const meshOnline = new THREE.Mesh(geometry, materialOnline);
  meshOnline.position.set(2,0,-2);
  scene.add(meshOnline);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
  directionalLight.position.set(10,60,0);
  directionalLight.castShadow = true;
  scene.add(directionalLight);

  const width = 10;
  const height = width*(window.innerHeight / window.innerWidth);
  camera = new THREE.OrthographicCamera(
    width / -1,
    width / 1,
    height / 1,
    height / -1,
    -1,
    20
  );

//const gridHelper = new THREE.GridHelper( 20, 20 );
//scene.add( gridHelper );

    const floorplane = new THREE.PlaneGeometry(40,40);
    const floorpanemat = new THREE.MeshLambertMaterial({color: 0xBBBBBB})
    const pane = new THREE.Mesh(floorplane, floorpanemat);
    scene.add(pane);
    pane.position.y = -1;
    pane.rotation.x = -1.555;


        //CANNONJS
        const shape = new CANNON.Box(
          new CANNON.Vec3(40, 1,40)
        );
        let mass = false ? 5 : 0;
        const body = new CANNON.Body({ mass, shape});
        body.position.set(0,-1.5,0);
        world.addBody(body);

    var axisHelper = new THREE.AxisHelper(100);
    scene.add(axisHelper);

  camera.position.set(4,4,4);
  camera.lookAt(0,0,0);

  renderer = new THREE.WebGLRenderer({antialias: true});
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.render(scene, camera);

  const container = document.getElementById('canvas');
  document.body.appendChild(container);

  container.appendChild(renderer.domElement);

}



function cutBox(topLayer, overlap, size, delta){
  const direction = topLayer.direction;
  const newWidth = direction == "x" ? overlap : topLayer.width;
  const newDepth = direction == "z" ? overlap : topLayer.depth;

  topLayer.width = newWidth;
  topLayer.depth = newDepth;

  topLayer.threejs.scale[direction] = overlap / size;
  topLayer.threejs.position[direction] -= delta / 2;

  topLayer.cannonjs.position[direction] -= delta/2;

  const shape = new CANNON.Box(
    new CANNON.Vec3(newWidth / 2, boxHeight / 2, newDepth / 2)
  );
  topLayer.cannonjs.shapes = []
  topLayer.cannonjs.addShape(shape);

}

function addOverHang(x, z, width, depth, player){
  const y = boxHeight * (stack.length - 1);
  if(player == 1){
    const overhang = generateBox(x,y,z,width,depth, true, 1);
    overhangs.push(overhang);
  } else {
    const overhang = generateBox(x,y,z,width,depth, true, 2);
    overhangs.push(overhang);
  }
}

function addLayer(x,z,width,depth,direction){
  const y = boxHeight * stack.length;
  const layer = generateBox(x,y,z,width,depth, false, 1);
  layer.direction = direction;
  stack.push(layer);
}

function OppaddLayer(x,z,width,depth,direction){
  const y = boxHeight * oppStack.length;
  const layer = generateBox(x,y,z,width,depth, false, 2);
  layer.direction = direction;
  oppStack.push(layer);
}

function generateBox(x,y,z,width,depth, falls, player){
  //THREEJS
  if(player == 1){
    const geometry = new THREE.BoxGeometry(width,boxHeight,depth);
    const color = new THREE.Color(`hsl(${30 + stack.length * 4}, 100%, 50%)`);
    const material = new THREE.MeshLambertMaterial({color});
  
    const mesh = new THREE.Mesh(geometry,material);
    mesh.position.set(x,y,z);
    scene.add(mesh);  
  
    //CANNONJS
    const shape = new CANNON.Box(
      new CANNON.Vec3(width/2, boxHeight/2,depth/2)
    );
    let mass = falls ? 5 : 0;
    const body = new CANNON.Body({ mass, shape});
    body.position.set(x,y,z);
    world.addBody(body);
  
  
    return{
      threejs: mesh,
      cannonjs: body,
      width,
      depth,
    }
  } else {
    const geometry = new THREE.BoxGeometry(width,boxHeight,depth);
    const color = new THREE.Color(`hsl(${180 + oppStack.length * 4}, 100%, 50%)`);
    const material = new THREE.MeshLambertMaterial({color});
    document.getElementById("oppscore").innerText = "Opp Score: " +oppStack.length;

    const mesh = new THREE.Mesh(geometry,material);
    mesh.position.set(x,y,z);
    scene.add(mesh);  
  
    //CANNONJS
    const shape = new CANNON.Box(
      new CANNON.Vec3(width/2, boxHeight/2,depth/2)
    );
    let mass = falls ? 5 : 0;
    const body = new CANNON.Body({ mass, shape});
    body.position.set(x,y,z);
    world.addBody(body);
  
  
    return{
      threejs: mesh,
      cannonjs: body,
      width,
      depth,
    }
  }
}

function animation(){
  requestAnimationFrame(animation);
  const speed = .05;
  const topLayer = stack[stack.length - 1];
  topLayer.threejs.position[topLayer.direction] += speed;
  topLayer.cannonjs.position[topLayer.direction] += speed;
  
  if(topLayer.threejs.position[topLayer.direction] > 10 && !checkOutOfBounds){
    missedBlock();
    checkOutOfBounds = true;
  }
  
  const opptopLayer = oppStack[oppStack.length - 1];
  opptopLayer.threejs.position[opptopLayer.direction] += speed;
  opptopLayer.cannonjs.position[opptopLayer.direction] += speed;


  if(stack.length > oppStack.length){
    if(camera.position.y < boxHeight * (stack.length - 2) +4){
      camera.position.y += speed;
    }
  } else {
    if(camera.position.y < boxHeight * (oppStack.length - 2) +4){
      camera.position.y += speed;
    }
  }

  updatePhysics();
  renderer.render(scene,camera);
}


function updatePhysics(){
  world.step(1 / 60);
  overhangs.forEach((Element) => {
    Element.threejs.position.copy(Element.cannonjs.position);
    Element.threejs.quaternion.copy(Element.cannonjs.quaternion);
  })
}

/*
socket.on('oppFail', function(data){
    missedBlock();

    scene.background = new THREE.Color(0x42f572);
    scene.fog = new THREE.Fog((new THREE.Color('green')), 1, 10);
    document.getElementById("GameoverH1").innerText = "CONGRATULATIONS, YOU WON!"
    document.getElementById("GameoverP").innerText = ("Your final score was: " + (stack.length-1));
    gameEnded = true;
});
*/

socket.on('allRdy', function(data){
  animation();
  gameStarted = true;
});

socket.on('gameWON', function(){
  gameWinAnimation();
});

socket.on('gameLost', function(){
  gameOverAnimation();
});

socket.on('newClick', function(data){
  if(gameStarted || !gameEnded){
    oppSTART();
  } 
});

socket.on('id', function(data){
  playerID = data;
});

socket.on('players', function(data){
  document.getElementById("players").innerText = "Players: " +data;
});

init();