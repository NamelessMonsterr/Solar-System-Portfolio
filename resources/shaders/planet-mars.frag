precision mediump float;
uniform float time;
uniform vec2 resolution;

float noise(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  
  float t = time * 0.06;
  
  // Red/orange terrain
  float n = noise(uv * 3.0 + t);
  vec3 color = vec3(0.8, 0.36, 0.25) * (0.7 + n * 0.3);
  
  // Darker regions (Valles Marineris)
  float valleys = noise(uv * 5.0);
  color = mix(color, vec3(0.5, 0.2, 0.1), valleys * 0.3);
  
  // Dust storms
  float dust = noise(uv * 8.0 + vec2(t * 2.0, t)) * 0.5;
  color = mix(color, vec3(0.9, 0.7, 0.5), dust * 0.3);
  
  // Polar ice caps
  float polar = smoothstep(0.85, 1.0, abs(uv.y * 2.0 - 1.0));
  color = mix(color, vec3(0.9, 0.85, 0.8), polar * 0.6);
  
  gl_FragColor = vec4(color, 1.0);
}
