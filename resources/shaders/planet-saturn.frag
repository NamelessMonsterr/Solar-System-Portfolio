precision mediump float;
uniform float time;
uniform vec2 resolution;

float noise(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  
  // Pale yellow-beige base
  vec3 color = vec3(0.95, 0.85, 0.68);
  
  // Subtle horizontal bands
  float bands = sin(uv.y * 18.0 + time * 0.05 + noise(uv * 2.0)) * 0.1;
  color += bands;
  
  // Ring shadow
  float ringDist = abs(uv.y - 0.5);
  if (ringDist < 0.18) {
    float shadow = smoothstep(0.12, 0.18, ringDist);
    color *= 0.5 + shadow * 0.5;
  }
  
  // Atmospheric variation
  float atmo = noise(uv * 8.0 + time * 0.03) * 0.08;
  color += atmo;
  
  gl_FragColor = vec4(color, 1.0);
}
