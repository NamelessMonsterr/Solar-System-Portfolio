export class ShaderBackgroundGenerator {
  constructor() {
    this.shaders = new Map();
    this.initShaders();
  }

  initShaders() {
    // Mercury - Fast, metallic surface
    this.shaders.set('Mercury', {
      vertex: this.getVertexShader(),
      fragment: `
        precision mediump float;
        uniform float time;
        uniform vec2 resolution;
        
        void main() {
          vec2 uv = gl_FragCoord.xy / resolution.xy;
          
          // Metallic noise pattern
          float n = fract(sin(dot(uv + time * 0.5, vec2(12.9898, 78.233))) * 43758.5453);
          vec3 color = vec3(0.55, 0.47, 0.33) + n * 0.2;
          
          // Add crater-like patterns
          float crater = smoothstep(0.3, 0.5, fract(sin(dot(uv * 5.0, vec2(7.12, 3.14))) * 50.0));
          color *= crater * 0.8 + 0.2;
          
          gl_FragColor = vec4(color, 1.0);
        }
      `
    });

    // Venus - Thick, swirling atmosphere
    this.shaders.set('Venus', {
      vertex: this.getVertexShader(),
      fragment: `
        precision mediump float;
        uniform float time;
        uniform vec2 resolution;
        
        float noise(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        
        void main() {
          vec2 uv = gl_FragCoord.xy / resolution.xy;
          
          // Swirling clouds
          float t = time * 0.1;
          vec2 p = uv * 3.0;
          float n = noise(p + vec2(t, t * 0.5));
          n += noise(p * 2.0 + vec2(t * 1.5, t)) * 0.5;
          n += noise(p * 4.0 + vec2(t * 2.0, t * 0.5)) * 0.25;
          
          vec3 color = vec3(1.0, 0.78, 0.29) * n;
          
          gl_FragColor = vec4(color, 1.0);
        }
      `
    });

    // Earth - Blue with cloud patterns
    this.shaders.set('Earth', {
      vertex: this.getVertexShader(),
      fragment: `
        precision mediump float;
        uniform float time;
        uniform vec2 resolution;
        
        float noise(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        
        void main() {
          vec2 uv = gl_FragCoord.xy / resolution.xy;
          
          // Ocean and land
          float t = time * 0.05;
          float land = noise(uv * 2.0 + t);
          vec3 ocean = vec3(0.2, 0.4, 0.8);
          vec3 landColor = vec3(0.2, 0.6, 0.3);
          vec3 color = mix(ocean, landColor, step(0.4, land));
          
          // Clouds
          float clouds = noise(uv * 5.0 + t * 2.0) * 0.5 + 0.5;
          color = mix(color, vec3(1.0), clouds * 0.3);
          
          gl_FragColor = vec4(color, 1.0);
        }
      `
    });

    // Mars - Red with dust storms
    this.shaders.set('Mars', {
      vertex: this.getVertexShader(),
      fragment: `
        precision mediump float;
        uniform float time;
        uniform vec2 resolution;
        
        float noise(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        
        void main() {
          vec2 uv = gl_FragCoord.xy / resolution.xy;
          
          // Red surface
          float t = time * 0.08;
          float n = noise(uv * 3.0 + t);
          vec3 color = vec3(0.8, 0.36, 0.36) * (0.7 + n * 0.3);
          
          // Dust storms
          float dust = noise(uv * 8.0 + vec2(t * 2.0, t)) * 0.5;
          color = mix(color, vec3(0.9, 0.7, 0.5), dust * 0.4);
          
          gl_FragColor = vec4(color, 1.0);
        }
      `
    });

    // Jupiter - Gas giant with bands
    this.shaders.set('Jupiter', {
      vertex: this.getVertexShader(),
      fragment: `
        precision mediump float;
        uniform float time;
        uniform vec2 resolution;
        
        float noise(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        
        void main() {
          vec2 uv = gl_FragCoord.xy / resolution.xy;
          
          // Horizontal bands
          float bands = sin(uv.y * 20.0 + time * 0.1) * 0.5 + 0.5;
          vec3 color1 = vec3(0.85, 0.79, 0.62);
          vec3 color2 = vec3(0.98, 0.84, 0.65);
          vec3 color = mix(color1, color2, bands);
          
          // Turbulence
          float turb = noise(uv * 10.0 + vec2(time * 0.2, 0.0));
          color += turb * 0.1;
          
          // Great Red Spot region
          float spot = smoothstep(0.3, 0.2, length(uv - vec2(0.7, 0.5)));
          color = mix(color, vec3(0.9, 0.4, 0.3), spot * 0.6);
          
          gl_FragColor = vec4(color, 1.0);
        }
      `
    });

    // Saturn - Pale with rings
    this.shaders.set('Saturn', {
      vertex: this.getVertexShader(),
      fragment: `
        precision mediump float;
        uniform float time;
        uniform vec2 resolution;
        
        void main() {
          vec2 uv = gl_FragCoord.xy / resolution.xy;
          
          // Pale yellow base
          vec3 color = vec3(0.98, 0.84, 0.65);
          
          // Subtle bands
          float bands = sin(uv.y * 15.0 + time * 0.05) * 0.1;
          color += bands;
          
          // Ring shadow
          float ringDist = abs(uv.y - 0.5);
          if (ringDist < 0.15) {
            float shadow = smoothstep(0.1, 0.15, ringDist);
            color *= 0.6 + shadow * 0.4;
          }
          
          gl_FragColor = vec4(color, 1.0);
        }
      `
    });

    // Uranus - Blue-green with subtle features
    this.shaders.set('Uranus', {
      vertex: this.getVertexShader(),
      fragment: `
        precision mediump float;
        uniform float time;
        uniform vec2 resolution;
        
        float noise(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        
        void main() {
          vec2 uv = gl_FragCoord.xy / resolution.xy;
          
          // Blue-green base
          vec3 color = vec3(0.4, 0.7, 0.8);
          
          // Subtle atmospheric features
          float n = noise(uv * 8.0 + time * 0.03);
          color += n * 0.1;
          
          gl_FragColor = vec4(color, 1.0);
        }
      `
    });

    // Neptune - Deep blue with storms
    this.shaders.set('Neptune', {
      vertex: this.getVertexShader(),
      fragment: `
        precision mediump float;
        uniform float time;
        uniform vec2 resolution;
        
        float noise(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        
        void main() {
          vec2 uv = gl_FragCoord.xy / resolution.xy;
          
          // Deep blue base
          vec3 color = vec3(0.25, 0.4, 0.8);
          
          // Storm features
          float storm = noise(uv * 6.0 + time * 0.1);
          color = mix(color, vec3(0.4, 0.5, 0.9), storm * 0.3);
          
          // Dark spot
          float spot = smoothstep(0.25, 0.15, length(uv - vec2(0.6, 0.4)));
          color = mix(color, vec3(0.1, 0.2, 0.4), spot * 0.5);
          
          gl_FragColor = vec4(color, 1.0);
        }
      `
    });

    // Pluto - Icy, varied terrain
    this.shaders.set('Pluto', {
      vertex: this.getVertexShader(),
      fragment: `
        precision mediump float;
        uniform float time;
        uniform vec2 resolution;
        
        float noise(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        
        void main() {
          vec2 uv = gl_FragCoord.xy / resolution.xy;
          
          // Varied icy terrain
          float n = noise(uv * 4.0);
          vec3 ice = vec3(0.9, 0.85, 0.8);
          vec3 dark = vec3(0.4, 0.3, 0.2);
          vec3 color = mix(dark, ice, n);
          
          // Heart-shaped bright region
          vec2 heart = uv - vec2(0.5, 0.4);
          float heartShape = smoothstep(0.35, 0.25, length(heart));
          color = mix(color, vec3(1.0, 0.95, 0.9), heartShape * 0.6);
          
          gl_FragColor = vec4(color, 1.0);
        }
      `
    });

    console.log(`✓ Initialized shaders for ${this.shaders.size} planets`);
  }

  getVertexShader() {
    return `
      attribute vec4 position;
      void main() {
        gl_Position = position;
      }
    `;
  }

  createShaderBackground(planetName, container) {
    const shaderData = this.shaders.get(planetName);
    if (!shaderData) {
      console.warn(`No shader for planet: ${planetName}`);
      return null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.objectFit = 'cover';

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      console.error('WebGL not supported');
      return null;
    }

    // Compile shaders
    const vertexShader = this.compileShader(gl, shaderData.vertex, gl.VERTEX_SHADER);
    const fragmentShader = this.compileShader(gl, shaderData.fragment, gl.FRAGMENT_SHADER);
    
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Shader program failed to link');
      return null;
    }

    // Set up geometry
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1
    ]), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Get uniform locations
    const timeLocation = gl.getUniformLocation(program, 'time');
    const resolutionLocation = gl.getUniformLocation(program, 'resolution');

    // Animation loop
    let startTime = Date.now();
    let animationId;

    const render = () => {
      const time = (Date.now() - startTime) * 0.001;
      
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(program);
      
      gl.uniform1f(timeLocation, time);
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      
      animationId = requestAnimationFrame(render);
    };

    render();

    container.appendChild(canvas);

    return {
      canvas,
      stop: () => {
        if (animationId) cancelAnimationFrame(animationId);
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      }
    };
  }

  compileShader(gl, source, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }
}
