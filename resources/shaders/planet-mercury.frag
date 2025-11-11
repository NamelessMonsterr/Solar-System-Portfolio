precision mediump float;
uniform float time;
uniform vec2 resolution;

float noise(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  
  // Metallic gray base
  float n = noise(uv * 5.0 + time * 0.5);
  vec3 color = vec3(0.55, 0.50, 0.45) + n * 0.15;
  
  // Crater patterns
  float crater1 = smoothstep(0.3, 0.5, noise(uv * 8.0));
  float crater2 = smoothstep(0.4, 0.6, noise(uv * 12.0));
  color *= crater1 * 0.7 + crater2 * 0.3;
  
  // Dust variation
  float dust = noise(uv * 15.0 + time * 0.1) * 0.1;
  color += dust;
  
  gl_FragColor = vec4(color, 1.0);
}
