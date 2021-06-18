'use strict';

import * as THREE from 'https://threejsfundamentals.org/threejs/resources/threejs/r127/build/three.module.js';

import {
  EffectComposer
} from 'https://threejsfundamentals.org/threejs/resources/threejs/r127/examples/jsm/postprocessing/EffectComposer.js';

import {
  RenderPass
} from 'https://threejsfundamentals.org/threejs/resources/threejs/r127/examples/jsm/postprocessing/RenderPass.js';

import {
  ShaderPass
} from 'https://threejsfundamentals.org/threejs/resources/threejs/r127/examples/jsm/postprocessing/ShaderPass.js';

import {
  GUI
} from 'https://threejsfundamentals.org/threejs/../3rdparty/dat.gui.module.js';

function main() {
  // create canvas
  const canvas = document.querySelector('#canvas');
  const renderer = new THREE.WebGLRenderer({
    canvas
  });

  // create camera
  const fov = 75;
  const aspect = 2;
  const near = 0.1
  const far = 5;
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.z = 2;

  // create scene
  const scene = new THREE.Scene();

  // create directional light
  {
    const color = 0xFFFFFF;
    const intensity = 2;
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(-1, 2, 4);
    scene.add(light);
  }

  // create box geometry
  const boxWidth = 1;
  const boxHeight = 1;
  const boxDepth = 1;
  const geometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);

  // 큐브 메쉬를 생성한 뒤, 리턴해주는 함수
  function makeInstance(geometry, color, x) {
    const material = new THREE.MeshPhongMaterial({
      color
    });

    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    cube.position.x = x;

    return cube;
  }

  // animate 함수에서 사용할 cubes 배열 생성
  const cubes = [
    makeInstance(geometry, 0x44aa88, 0),
    makeInstance(geometry, 0x8844aa, -2),
    makeInstance(geometry, 0xaa8844, 2),
  ];

  // 후처리 패스 체인을 관리 및 실행해주는 객체인 EffectComposer() 생성
  const composoer = new EffectComposer(renderer); // 씬을 렌더할 렌더러 객체를 넘겨주면서 생성

  // 씬과 카메라를 넘겨받은 뒤, EffectComposer가 패스 체이닝에 사용하는 두 렌더타겟 중 첫번째 렌더타겟에 넘겨받은 씬을 렌더해 즐 RenderPass를 첫 패스로 추가함.
  composoer.addPass(new RenderPass(scene, camera));

  /**
   * ShaderPass()
   * 
   * 쉐이더를 사용하여 직접 후처리 패스를 만들 수 있는 헬퍼 클래스.
   * 인자로는 vertex 쉐이더, fragment 쉐이더, 기본값(uniforms)이 묶인 객체를 전달받음.
   * 
   * 이 클래스는 1. 이전 pass까지 적용된 결과물에서 어떤 텍스처를 읽을지
   * 2. EffectComposer의 렌더 타겟에 렌더할 지, 캔버스에 렌더할 지 결정함.
   * 
   * 아래의 쉐이더 코드는 ShaderPass에 넣어줄
   * 이전 pass의 결과물에 특정 색을 혼합하는 후처리 쉐이더를 정리한거임.
   */
  const colorShader = {
    uniforms: {
      // tDiffuse는 이전 pass의 결과물을 받아오기 위한 것. 거의 모든 경우 필수로 지정해줘야 함.
      tDiffuse: {
        value: null
      },
      // 얘는 이전 pass 결과물에 혼합해 줄 특정 색
      color: {
        value: new THREE.Color(0x88CCFF)
      },
    },
    // 아래의 vertex 쉐이더는 후처리 쉐이더 작성 시 거의 표준처럼 사용하는 코드, 대부분의 경우 바꿔줄 필요 없음.
    // uv, projectionMatrix, modelViewMatrix, position 변수값에는 Three.js가 알아서 값을 넣어줌.(정확히는 ShaderPass 헬퍼 클래스가 넣어주는 거겠지)
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1);
      }
    `,
    // 아래의 fragment 쉐이더의 vec4 previousPassColor = texture2D(tDiffuse, vUv);로 이전 pass에서 넘겨준 결과물의 픽셀 색상값을 가져옴
    // previousPassColor.rgb * color 이렇게 이전 pass 결과물의 픽셀 색상값에 uniforms.color에 지정한 색상값을 곱해서 gl_FragColor 에 저장함.
    fragmentShader: `
      varying vec2 vUv;
      uniform sampler2D tDiffuse;
      uniform vec3 color;
      void main() {
        vec4 previousPassColor = texture2D(tDiffuse, vUv);
        gl_FragColor = vec4(
            previousPassColor.rgb * color,
            previousPassColor.a);
      }
    `,
  };

  // ShaderPass를 생성하면서 위에서 작성한 쉐이더 코드를 넘겨줌
  const colorPass = new ShaderPass(colorShader);
  // EffectComposer에 마지막으로 추가하는 pass는 말그대로 마지막이니까 더 이상 렌더 타겟이 아니라 캔버스에 결과물을 렌더해줘야 하므로, 해당 옵션을 true로 지정해 줌
  colorPass.renderToScreen = true;
  composoer.addPass(colorPass);

  // resize renderer
  function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
      renderer.setSize(width, height, false);
    }

    return needResize;
  }

  // 런타임에서 후처리 패스의 속성값을 바꾸고 싶다면 해당 패스의 uniform.XXX.value 값을 바꿔주면 되고, 이거를 dat.GUI에서 입력받은 값으로 바꿔줄거임.
  // ShaderPass.uniforms.color.value는 말 그대로 쉐이더 코드에서 지정한 이전 pass 결과물에 혼합해 줄 특정색을 가리키며, 이 색의 r, g, b값을 dat.GUI로 각각 받아와 색상값을 조정해줄거임.
  const gui = new GUI();
  gui.add(colorPass.uniforms.color.value, 'r', 0, 4).name('red');
  gui.add(colorPass.uniforms.color.value, 'g', 0, 4).name('green');
  gui.add(colorPass.uniforms.color.value, 'b', 0, 4).name('blue');

  let then = 0; // 이전 프레임의 타임스탬프값을 담아놓을 변수
  // animate
  function animate(now) {
    now *= 0.001 // 밀리초 단위의 타임스탬프값을 초 단위로 변환함
    const deltaTime = now - then; // 현재 타임스탬프값에서 이전 타임스탬프값을 뺸 값(거의 항상 대략 16.66...값에 근접할거임)을 구해놓음.
    then = now; // 매 프레임마다 현재 타임스탬프값을 이전 타임스탬프값에 overwrite해놓음.

    // 렌더러가 리사이징되면 변화한 렌더러 사이즈에 맞춰서 카메라 비율(aspect)도 업데이트 해줘야 함
    if (resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();

      // EffectComposer가 패스 체인을 모두 적용해 준 결과물 씬을 캔버스에 렌더링해줄 때, 캔버스 크기가 리사이징 되었다면 결과물의 크기를 리사이징된 캔버스 크기로 맞춰주어야 함.
      composoer.setSize(canvas.width, canvas.height);
    }

    // 각 큐브 메쉬에 회전 애니메이션을 줌
    cubes.forEach((cube, index) => {
      const speed = 1 + index * 0.1;
      const rotate = now * speed;
      cube.rotation.x = rotate;
      cube.rotation.y = rotate;
    });

    // WebGLRenderer.render() 메서드 대신 EffectComposer.render()를 호출해줘야 함.
    // 얘를 호출하면 EffectComposer에 추가된 후처리 패스 체인들을 순서대로 실행하여 최종적으로 모든 후처리 효과들이 적용된 씬을 캔버스에 렌더링 해줄거임
    // 이때 인자로 마지막 프레임을 렌더링한 이후 지난 시간값인 deltaTime을 인자로 받는데, 이게 왜 필요하냐면
    // 패스 체인에 추가된 pass들 중에서 애니메이션이 필요한 pass가 있다면 이 값을 이용해서 처리해줘야 하기 때문이라고 함.
    // 이 예제에서는 애니메이션이 필요한 예제는 없지만, 해당 메서드를 호출할 때 습관적으로 이 값을 넘겨주는 게 좋을 듯.
    composoer.render(deltaTime);

    requestAnimationFrame(animate); // 내부에서 반복호출
  }

  requestAnimationFrame(animate);
}

main();