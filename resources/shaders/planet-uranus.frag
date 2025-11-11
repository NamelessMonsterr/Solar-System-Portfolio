precision mediump float;
uniform float time;
uniform vec2 resolution;

float noise(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  
  // Blue-green ice giant color
  vec3 color = vec3(0.4, 0.7, 0.75);
  
  // Methane clouds (very subtle)
  float clouds = noise(uv * 6.0 + time * 0.02);
  color += clouds * 0.08;
  
  // Faint banding
  float bands = sin(uv.y * 12.0 + time * 0.03) * 0.05;
  color += bands;
  
  // Ice crystal shimmer
  float shimmer = noise(uv * 20.0 + time * 0.5) * 0.05;
  color += shimmer;
  
  gl_FragColor = vec4(color, 1.0);
}
