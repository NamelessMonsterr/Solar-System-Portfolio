precision mediump float;
uniform float time;
uniform vec2 resolution;

float noise(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  
  // Thick atmosphere - yellowish
  float t = time * 0.08;
  vec2 p = uv * 3.0;
  
  // Layered clouds
  float n = noise(p + vec2(t, t * 0.5));
  n += noise(p * 2.0 + vec2(t * 1.5, t)) * 0.5;
  n += noise(p * 4.0 + vec2(t * 2.0, t * 0.5)) * 0.25;
  
  vec3 color = vec3(1.0, 0.85, 0.35) * n;
  
  // Sulfuric acid clouds
  float clouds = noise(uv * 6.0 + time * 0.15) * 0.3;
  color = mix(color, vec3(0.95, 0.75, 0.25), clouds);
  
  gl_FragColor = vec4(color, 1.0);
}
