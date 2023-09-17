import {vec2, vec3, vec4,mat4} from 'gl-matrix';
const Stats = require('stats-js');
import * as DAT from 'dat.gui';
import Icosphere from './geometry/Icosphere';
import Square from './geometry/Square';
import Cube from './geometry/Cube';
import OpenGLRenderer from './rendering/gl/OpenGLRenderer';
import Camera from './Camera';
import {setGL} from './globals';
import ShaderProgram, {Shader} from './rendering/gl/ShaderProgram';
import { mode } from '../webpack.config';

// Define an object with application parameters and button callbacks
// This will be referred to by dat.GUI's functions that add GUI elements.
const controls = {
  tesselations: 5,
  'Load Scene': loadScene, // A function pointer, essentially
  GUIcolor:[219, 85, 21,1],
  GUIcolor2:[0, 0, 0,1],
  Float0: 0.5,
  Float1: 0.5,
};

let icosphere: Icosphere;
let square: Square;
let cube: Cube;
let prevTesselations: number = 5;
let color: vec4;
let color2: vec4;
let date: Date;

function loadScene() {
  icosphere = new Icosphere(vec3.fromValues(0, 0, 0), 1, controls.tesselations);
  icosphere.create();
  square = new Square(vec3.fromValues(0, 0, 0));
  square.create();
  cube = new Cube(vec3.fromValues(0, 0, 0));
  cube.create();
}

function loadGUI(){
    // Add controls to the gui
    const gui = new DAT.GUI();
    gui.add(controls, 'tesselations', 0, 8).step(1);
    color = vec4.fromValues(0.86,0.33,0.08,1);
    gui.addColor(controls,"GUIcolor").name("base color").onChange((value)=>{
      color = vec4.fromValues(value[0]/255.0,value[1]/255.0,value[2]/255.0,1);
    });
    color2 = vec4.fromValues(0,0,0,1);
    gui.addColor(controls,"GUIcolor2").name("mix color").onChange((value)=>{
      color2 = vec4.fromValues(value[0]/255.0,value[1]/255.0,value[2]/255.0,1);
    });
    gui.add(controls,"Float0",0.0,1.0).name("high freq");
    gui.add(controls,"Float1",0.0,1.0).name("low freq");

    var resetSliders = function (name:string,val:any) {
      for (var i = 0; i < gui.__controllers.length; i++) {
          if (gui.__controllers[i].property==name){
             gui.__controllers[i].setValue(val);
          }   
      }
    };

    var obj = {
      add: function() {
        controls.tesselations = 5;
        color = vec4.fromValues(219/255., 85/255., 21/255.,1);
        color2 = vec4.fromValues(0, 0, 0,1);
        controls.Float0 = 0.5;
        controls.Float1 = 0.5;
        resetSliders("tesselations",5);
        resetSliders("Float0",.5);
        resetSliders("Float1",.5);
        resetSliders("GUIcolor2",[0, 0, 0,1]);
        resetSliders("GUIcolor",[219, 85, 21,1]);
      }
    };

    gui.add(obj, "add").name("reset");
}

function main() {
  // Initial display for framerate
  const stats = Stats();
  stats.setMode(0);
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.left = '0px';
  stats.domElement.style.top = '0px';
  document.body.appendChild(stats.domElement);
  date = new Date();

  // get canvas and webgl context
  const canvas = <HTMLCanvasElement> document.getElementById('canvas');
  const gl = <WebGL2RenderingContext> canvas.getContext('webgl2');
  if (!gl) {
    alert('WebGL 2 not supported!');
  }
  // `setGL` is a function imported above which sets the value of `gl` in the `globals.ts` module.
  // Later, we can import `gl` from `globals.ts` to access it
  setGL(gl);

  // Initial call to load scene
  loadScene();
  loadGUI();
  
  const camera = new Camera(vec3.fromValues(0, 0, 5), vec3.fromValues(0, 0, 0));
  const renderer = new OpenGLRenderer(canvas);
  renderer.setClearColor(0.2, 0.2, 0.2, 1);
  gl.enable(gl.DEPTH_TEST);

  const lambert = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/lambert-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/lambert-frag.glsl')),
  ]);
  const bgRender = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/flat-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/flat-frag.glsl')),
  ]);
  lambert.addUnif("u_time");
  lambert.addUnif("u_Color2");
  lambert.addUnif("u_lowAmp");
  lambert.addUnif("u_highAmp");
  bgRender.addUnif("u_time");
  bgRender.addUnif("u_Dimensions");
  bgRender.addUnif("u_cameraPos");


  // This function will be called every frame
  function tick() {
    camera.update();
    stats.begin();
    gl.viewport(0, 0, window.innerWidth, window.innerHeight);
    renderer.clear();
    //update inputs
    if(controls.tesselations != prevTesselations)
    {
      prevTesselations = controls.tesselations;
      icosphere = new Icosphere(vec3.fromValues(0, 0, 0), 1, prevTesselations);
      icosphere.create();
    }
    lambert.setGeometryColor(color);
    let time = Date.now()%2000000/1000.0;
    lambert.setUnifFloat("u_time",time);
    lambert.setUnifVec4("u_Color2",color2);
    lambert.setUnifFloat("u_highAmp",controls.Float0);
    lambert.setUnifFloat("u_lowAmp",controls.Float1);
    bgRender.setGeometryColor(color);
    bgRender.setUnifFloat("u_time",time);
    bgRender.setUnifVec2("u_Dimensions",vec2.fromValues(window.innerWidth,window.innerHeight));
    bgRender.setUnifVec3("u_cameraPos",camera.controls.eye);
    let model = mat4.create();
    mat4.identity(model);

    lambert.setModelMatrix(model);

    //render

    gl.depthMask(false);
    renderer.render(camera,bgRender,[
      square,
    ]);
    gl.depthMask(true);
    renderer.render(camera, lambert, [
      icosphere,
    ]);
    stats.end();

    // Tell the browser to call `tick` again whenever it renders a new frame
    requestAnimationFrame(tick);
  }

  window.addEventListener('resize', function() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.setAspectRatio(window.innerWidth / window.innerHeight);
    camera.updateProjectionMatrix();
  }, false);

  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.setAspectRatio(window.innerWidth / window.innerHeight);
  camera.updateProjectionMatrix();

  // Start the render loop
  tick();
}

main();
