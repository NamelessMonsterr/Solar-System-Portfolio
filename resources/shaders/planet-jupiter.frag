precision mediump float;
uniform float time;
uniform vec2 resolution;

float noise(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  
  // Horizontal bands
  float bands = sin(uv.y * 25.0 + time * 0.1 + noise(uv * 3.0) * 2.0) * 0.5 + 0.5;
  
  vec3 color1 = vec3(0.85, 0.75, 0.60);
  vec3 color2 = vec3(0.95, 0.82, 0.65);
  vec3 color = mix(color1, color2, bands);
  
  // Turbulence
  float turb = noise(uv * 10.0 + vec2(time * 0.2, 0.0));
  color += (turb - 0.5) * 0.1;
  
  // Great Red Spot
  vec2 spotCenter = vec2(0.65, 0.45);
  float spotDist = length(uv - spotCenter);
  float spot = smoothstep(0.15, 0.08, spotDist);
  color = mix(color, vec3(0.9, 0.4, 0.3), spot * 0.7);
  
  // Storm swirls
  float swirl = noise(uv * 15.0 + time * 0.1);
  color += swirl * 0.05;
  
  gl_FragColor = vec4(color, 1.0);
}
