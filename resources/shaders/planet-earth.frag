precision mediump float;
uniform float time;
uniform vec2 resolution;

float noise(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  
  float t = time * 0.05;
  
  // Continents and ocean
  float land = noise(uv * 2.5 + t * 0.1);
  vec3 ocean = vec3(0.1, 0.3, 0.7);
  vec3 landColor = vec3(0.2, 0.5, 0.2);
  vec3 color = mix(ocean, landColor, step(0.45, land));
  
  // Polar ice caps
  float polar = smoothstep(0.8, 1.0, abs(uv.y * 2.0 - 1.0));
  color = mix(color, vec3(0.9, 0.95, 1.0), polar);
  
  // Clouds
  float clouds = noise(uv * 6.0 + time * 0.1) * 0.5 + 0.5;
  color = mix(color, vec3(1.0), clouds * 0.4);
  
  // Atmosphere glow
  float glow = 1.0 - length(uv - 0.5) * 1.5;
  color += vec3(0.2, 0.3, 0.5) * glow * 0.2;
  
  gl_FragColor = vec4(color, 1.0);
}
