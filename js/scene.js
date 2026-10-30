import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const EARTH_TEXTURE = 'https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-base/january/world.200401.3x5400x2700.jpg';
const EARTH_RADIUS = 1.45;
const TAU = Math.PI * 2;

function hashText(text) {
  let h = 2166136261;
  for (let i = 0; i < String(text).length; i++) h = Math.imul(h ^ String(text).charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967295;
}
function fallbackEarthTexture() {
  const w = 1024, h = 512, cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  const ocean = ctx.createLinearGradient(0, 0, 0, h);
  ocean.addColorStop(0, '#182f47'); ocean.addColorStop(.5, '#0c2e43'); ocean.addColorStop(1, '#101c2d');
  ctx.fillStyle = ocean; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#526557';
  const continents = [
    [[130,100],[190,64],[241,83],[258,118],[228,148],[213,180],[181,201],[166,171],[141,155]],
    [[220,208],[250,226],[256,274],[236,323],[224,370],[202,350],[198,299],[212,257]],
    [[435,95],[470,70],[506,80],[528,110],[557,119],[555,147],[528,164],[512,199],[483,190],[470,156],[445,145]],
    [[505,201],[553,210],[587,248],[572,290],[547,322],[524,301],[513,265],[486,234]],
    [[566,96],[612,73],[662,93],[701,118],[760,126],[788,159],[755,177],[713,167],[685,197],[641,174],[617,145],[584,140]],
    [[740,250],[780,230],[814,247],[836,278],[809,312],[774,301]],
    [[69,35],[119,22],[156,37],[146,60],[104,63]],
    [[841,70],[871,55],[896,70],[881,89],[849,90]]
  ];
  continents.forEach((poly, idx) => {
    ctx.beginPath(); poly.forEach(([x,y], i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y)); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(167,181,144,.4)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = idx % 2 ? '#5e6b56' : '#526557';
  });
  for (let i = 0; i < 1700; i++) {
    const x = Math.random()*w, y = Math.random()*h, r = Math.random()*2.2;
    ctx.fillStyle = `rgba(195,210,192,${Math.random()*.09})`; ctx.fillRect(x,y,r,r);
  }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; return tex;
}
function cloudTexture() {
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 512;
  const ctx = cv.getContext('2d'); ctx.clearRect(0, 0, 1024, 512);
  for (let i=0; i<560; i++) {
    const x = Math.random()*1024, y = Math.random()*512;
    const rx = 3+Math.random()*25, ry = 1.5+Math.random()*7;
    const g = ctx.createRadialGradient(x,y,0,x,y,rx);
    g.addColorStop(0,`rgba(235,244,255,${0.035+Math.random()*.1})`); g.addColorStop(1,'rgba(235,244,255,0)');
    ctx.fillStyle=g; ctx.beginPath(); ctx.ellipse(x,y,rx,ry,Math.random(),0,TAU); ctx.fill();
  }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace=THREE.SRGBColorSpace; return tex;
}
function makeAtmosphere(radius) {
  return new THREE.Mesh(
    new THREE.SphereGeometry(radius, 64, 48),
    new THREE.ShaderMaterial({
      transparent:true, side:THREE.BackSide, depthWrite:false, blending:THREE.AdditiveBlending,
      vertexShader:`varying vec3 vNormal; varying vec3 vView; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vNormal = normalize(normalMatrix * normal); vView = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
      fragmentShader:`varying vec3 vNormal; varying vec3 vView; void main(){ float f = pow(1.0 - max(dot(normalize(vNormal), normalize(vView)),0.0), 2.15); vec3 c = mix(vec3(0.16,0.34,0.60), vec3(0.40,0.64,0.84), f); gl_FragColor = vec4(c, f * 0.56); }`
    })
  );
}
function makeGrid() {
  const group = new THREE.Group();
  const material = new THREE.LineBasicMaterial({ color:0x81b0c8, transparent:true, opacity:.11, depthWrite:false });
  for (let lat=-60; lat<=60; lat+=30) {
    const points=[]; const phi=THREE.MathUtils.degToRad(lat);
    for(let i=0;i<=180;i++){const theta=i/180*TAU; points.push(new THREE.Vector3((EARTH_RADIUS+0.008)*Math.cos(phi)*Math.cos(theta),(EARTH_RADIUS+0.008)*Math.sin(phi),(EARTH_RADIUS+0.008)*Math.cos(phi)*Math.sin(theta)));}
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),material));
  }
  for (let lon=0; lon<180; lon+=30) {
    const points=[];const theta=THREE.MathUtils.degToRad(lon);
    for(let i=0;i<=180;i++){const phi=-Math.PI/2+i/180*Math.PI;points.push(new THREE.Vector3((EARTH_RADIUS+0.01)*Math.cos(phi)*Math.cos(theta),(EARTH_RADIUS+0.01)*Math.sin(phi),(EARTH_RADIUS+0.01)*Math.cos(phi)*Math.sin(theta)));}
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),material));
    const points2=points.map(p=>new THREE.Vector3(-p.x,p.y,-p.z));
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points2),material));
  }
  group.visible = true;
  return group;
}

export function createObservatoryScene(container, { onObjectPick = () => {}, onReady = () => {} } = {}) {
  const canvas = container.querySelector('#scene-canvas');
  const scene = new THREE.Scene(); scene.background = null;
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 400);
  camera.position.set(0.1, 0.12, 5.3);
  const renderer = new THREE.WebGLRenderer({ canvas, alpha:true, antialias:true, powerPreference:'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = .065; controls.enablePan = true;
  controls.minDistance = 3.25; controls.maxDistance = 11; controls.rotateSpeed = .45; controls.zoomSpeed = .7;
  controls.target.set(0,0,0);

  scene.add(new THREE.AmbientLight(0x90a9c3, 1.0));
  const keyLight = new THREE.DirectionalLight(0xe7efff, 2.7); keyLight.position.set(-5,3,6); scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0x4b8ce0, 1.5); rimLight.position.set(4,-2,-5); scene.add(rimLight);

  // Deep background starfield: decorative points only, independent from catalog data.
  const starVertices = [];
  for(let i=0;i<1900;i++) { const r=65+Math.random()*100; const v=new THREE.Vector3().randomDirection().multiplyScalar(r); starVertices.push(v.x,v.y,v.z); }
  const starGeom = new THREE.BufferGeometry(); starGeom.setAttribute('position', new THREE.Float32BufferAttribute(starVertices,3));
  const stars = new THREE.Points(starGeom, new THREE.PointsMaterial({ color:0xb9c8dd, size:.33, sizeAttenuation:true, transparent:true, opacity:.65, depthWrite:false })); scene.add(stars);

  const earthGroup = new THREE.Group(); scene.add(earthGroup);
  const earthGeom = new THREE.SphereGeometry(EARTH_RADIUS, 96, 72);
  const fallback = fallbackEarthTexture();
  const earthMat = new THREE.MeshStandardMaterial({ map:fallback, roughness:1, metalness:0, color:0xe1e8ef });
  const earth = new THREE.Mesh(earthGeom, earthMat); earth.rotation.z = THREE.MathUtils.degToRad(-8); earthGroup.add(earth);
  const loader = new THREE.TextureLoader(); loader.setCrossOrigin('anonymous');
  loader.load(EARTH_TEXTURE, texture => {
    texture.colorSpace=THREE.SRGBColorSpace; texture.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);
    earthMat.map=texture; earthMat.needsUpdate=true; fallback.dispose(); onReady({ texture:'NASA Blue Marble' });
  }, undefined, () => { onReady({ texture:'procedural fallback' }); });
  const clouds = new THREE.Mesh(new THREE.SphereGeometry(EARTH_RADIUS*1.008,64,48), new THREE.MeshStandardMaterial({ map:cloudTexture(), transparent:true, opacity:.20, depthWrite:false, blending:THREE.AdditiveBlending })); earthGroup.add(clouds);
  const atmosphere = makeAtmosphere(EARTH_RADIUS*1.075); earthGroup.add(atmosphere);
  const grid = makeGrid(); earthGroup.add(grid);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(.17,32,24),new THREE.MeshStandardMaterial({color:0x969ba2,roughness:1,metalness:0}));
  moon.position.set(-2.18,.23,.25); scene.add(moon);
  const moonHalo = new THREE.Mesh(new THREE.SphereGeometry(.205,24,16),new THREE.MeshBasicMaterial({color:0x8498ac,transparent:true,opacity:.09,side:THREE.BackSide})); moon.add(moonHalo);

  const encounterGroup = new THREE.Group(); scene.add(encounterGroup);
  const clickable = [];
  const raycaster = new THREE.Raycaster(); raycaster.params.Points.threshold=.1;
  const pointer = new THREE.Vector2();
  let currentView='earth', reduceMotion=false, disposed=false, lastTime=performance.now();
  let selectedId=null;

  function clearEncounterGroup(){
    encounterGroup.traverse(obj=>{if(obj.geometry)obj.geometry.dispose(); if(obj.material){if(Array.isArray(obj.material))obj.material.forEach(m=>m.dispose());else obj.material.dispose();}});
    encounterGroup.clear(); clickable.length=0;
  }
  function markerColor(neo){ return neo.potentiallyHazardous ? 0xe88586 : 0x83d7e0; }
  function setObjects(objects, selectId=selectedId){
    clearEncounterGroup();
    const sample = objects.slice(0,180);
    sample.forEach((neo,index)=>{
      const seed=hashText(neo.id); const angle=seed*TAU; const tilt=(hashText(neo.name)*.54)-.27;
      const dist=Number.isFinite(neo.missKm)?neo.missKm:800000;
      const radius=2.05+Math.min(1.4,Math.max(0,Math.log10(Math.max(dist,10000)/10000))*.42);
      const orbitPoints=[]; const steps=100;
      for(let i=0;i<=steps;i++){
        const a=i/steps*TAU; const x=Math.cos(a)*radius; const y=Math.sin(a)*radius*.48;
        const ct=Math.cos(tilt),st=Math.sin(tilt); const yy=y*ct, zz=y*st;
        orbitPoints.push(new THREE.Vector3(x,yy,zz));
      }
      const selected=neo.id===selectId;
      const lineMat=new THREE.LineBasicMaterial({color:selected?0xe7bb83:(neo.potentiallyHazardous?0xe88586:0x7392b4),transparent:true,opacity:selected?.65:.10,depthWrite:false});
      const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(orbitPoints),lineMat); line.rotation.y=seed*1.8; line.rotation.x=tilt; line.userData.neoId=neo.id; encounterGroup.add(line);
      const pos=new THREE.Vector3(Math.cos(angle)*radius,Math.sin(angle)*radius*.48,Math.sin(angle*1.7)*.18);
      const size=selected?.085:Math.min(.075,Math.max(.035,.025+Math.sqrt(Math.max(neo.avgDiameter||20,1))*.002));
      const material=new THREE.MeshBasicMaterial({color:markerColor(neo),transparent:true,opacity:selected?1:.9});
      const marker=new THREE.Mesh(new THREE.SphereGeometry(size,12,10),material); marker.position.copy(pos); marker.userData.neo=neo; marker.userData.neoId=neo.id; marker.userData.baseSize=size;
      const glow=new THREE.Mesh(new THREE.SphereGeometry(size*2.6,12,10),new THREE.MeshBasicMaterial({color:markerColor(neo),transparent:true,opacity:selected?.18:.08,depthWrite:false})); glow.position.copy(pos); marker.add(glow);
      encounterGroup.add(marker); clickable.push(marker);
      if(selected){
        const ring=new THREE.Mesh(new THREE.RingGeometry(size*1.8,size*2.25,36),new THREE.MeshBasicMaterial({color:0xe7bb83,side:THREE.DoubleSide,transparent:true,opacity:.7,depthWrite:false}));
        ring.position.copy(pos);ring.lookAt(camera.position);ring.userData.isSelectionRing=true;encounterGroup.add(ring);
      }
    });
  }
  function selectObject(id){ selectedId=id; setObjects(window.__ecliptaraObjects||[],id); }
  function changeView(mode){
    currentView=mode;
    const targetZ=mode==='orbit'?8.7:5.3;
    const targetY=mode==='orbit'?.16:.08;
    const start=camera.position.clone(); const end=new THREE.Vector3(mode==='orbit'?.2:.1,targetY,targetZ);
    const startTime=performance.now(), duration=reduceMotion?1:760;
    function step(now){if(disposed)return;const t=Math.min(1,(now-startTime)/duration);const e=1-Math.pow(1-t,3);camera.position.lerpVectors(start,end,e);controls.target.set(0,0,0);controls.update();if(t<1)requestAnimationFrame(step);}
    requestAnimationFrame(step);
  }
  function resize(){const w=Math.max(1,container.clientWidth),h=Math.max(1,container.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
  function pointerDown(event){
    const rect=canvas.getBoundingClientRect();pointer.x=((event.clientX-rect.left)/rect.width)*2-1;pointer.y=-((event.clientY-rect.top)/rect.height)*2+1;
    raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects(clickable,false);if(hits.length){const neo=hits[0].object.userData.neo;if(neo)onObjectPick(neo);}
  }
  canvas.addEventListener('click',pointerDown);
  const ro=new ResizeObserver(resize);ro.observe(container);resize();
  const textureStatus={value:'loading'};
  function animate(now){if(disposed)return;requestAnimationFrame(animate);const dt=Math.min(.05,(now-lastTime)/1000);lastTime=now;
    if(!reduceMotion){earth.rotation.y+=dt*.018;clouds.rotation.y+=dt*.024;stars.rotation.y+=dt*.0008;}
    controls.update();renderer.render(scene,camera);
  }
  requestAnimationFrame(animate);
  return {
    setObjects(objects, selectId){window.__ecliptaraObjects=objects;selectedId=selectId??selectedId;setObjects(objects,selectedId);},
    selectObject,
    changeView,
    reset(){changeView('earth');controls.reset();camera.position.set(.1,.12,5.3);controls.target.set(0,0,0);controls.update();},
    zoomIn(){camera.position.multiplyScalar(.87);const d=camera.position.length();if(d<controls.minDistance)camera.position.setLength(controls.minDistance);controls.update();},
    zoomOut(){camera.position.multiplyScalar(1.13);const d=camera.position.length();if(d>controls.maxDistance)camera.position.setLength(controls.maxDistance);controls.update();},
    toggleGrid(visible){grid.visible=Boolean(visible);},
    setReducedMotion(value){reduceMotion=Boolean(value);},
    getView(){return currentView;},
    dispose(){disposed=true;ro.disconnect();canvas.removeEventListener('click',pointerDown);controls.dispose();renderer.dispose();clearEncounterGroup();}
  };
}
