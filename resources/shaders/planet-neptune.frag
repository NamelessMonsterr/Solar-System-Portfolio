precision mediump float;
uniform float time;
uniform vec2 resolution;

float noise(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  
  // Deep blue base
  vec3 color = vec3(0.2, 0.4, 0.8);
  
  // Dynamic storm features
  float storm = noise(uv * 7.0 + time * 0.12);
  color = mix(color, vec3(0.3, 0.5, 0.9), storm * 0.4);
  
  // Great Dark Spot
  vec2 spotCenter = vec2(0.55, 0.4);
  float spotDist = length(uv - spotCenter);
  float darkSpot = smoothstep(0.18, 0.1, spotDist);
  color = mix(color, vec3(0.1, 0.2, 0.4), darkSpot * 0.6);
  
  // Wind patterns
  float wind = noise(uv * 12.0 + vec2(time * 0.3, 0.0));
  color += wind * 0.06;
  
  gl_FragColor = vec4(color, 1.0);
}
