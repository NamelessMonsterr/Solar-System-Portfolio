precision mediump float;
uniform float time;
uniform vec2 resolution;

float noise(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  
  // Varied icy/rocky terrain
  float n = noise(uv * 4.0);
  vec3 ice = vec3(0.9, 0.85, 0.8);
  vec3 dark = vec3(0.35, 0.25, 0.2);
  vec3 color = mix(dark, ice, n);
  
  // Tombaugh Regio (heart-shaped bright region)
  vec2 heartCenter = vec2(0.5, 0.4);
  float heartDist = length(uv - heartCenter);
  float heart = smoothstep(0.25, 0.15, heartDist);
  color = mix(color, vec3(1.0, 0.95, 0.9), heart * 0.7);
  
  // Nitrogen ice plains
  float plains = noise(uv * 8.0) * 0.5 + 0.5;
  color = mix(color, vec3(0.95, 0.90, 0.85), plains * 0.2);
  
  // Surface texture
  float texture = noise(uv * 15.0 + time * 0.01) * 0.1;
  color += texture;
  
  gl_FragColor = vec4(color, 1.0);
}
