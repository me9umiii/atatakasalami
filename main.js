const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const renderer = new THREE.WebGLRenderer();

// 最大サイズ
const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1080;

renderer.setSize(MAX_WIDTH, MAX_HEIGHT);
document.body.appendChild(renderer.domElement);

// Fragment Shader (GLSL)
const fragmentShader = `

uniform vec2 iResolution;
uniform float iTime;

float hash( float n ) {
    return fract(sin(n)*43758.5453);
}

float noise( in vec3 x ) {
    vec3 p = floor(x);
    vec3 f = fract(x);
    f = f*f*(3.0-2.0*f);
    float n = p.x + p.y*57.0 + 113.0*p.z;
    return mix(mix(mix(hash(n+  0.0), hash(n+  1.0),f.x),
                   mix(hash(n+ 57.0), hash(n+ 58.0),f.x),f.y),
               mix(mix(hash(n+113.0), hash(n+114.0),f.x),
                   mix(hash(n+170.0), hash(n+171.0),f.x),f.y),f.z);
}

vec3 noise3( in vec3 x ) {
    return vec3( noise(x+vec3(123.456,0.567,0.37)),
                 noise(x+vec3(0.11,47.43,19.17)),
                 noise(x) );
}

float bias(float x, float b) {
    return x/((1.0/b - 2.0)*(1.0 - x) + 1.0);
}

float gain(float x, float g) {
    float t = (1.0/g - 2.0)*(1.0 - (2.0*x));
    return x < 0.5 ? (x / (t + 1.0)) : (t - x) / (t - 1.0);
}

mat3 rotation(float angle, vec3 axis) {
    float s = sin(-angle);
    float c = cos(-angle);
    float oc = 1.0 - c;
    vec3 sa = axis * s;
    vec3 oca = axis * oc;
    return mat3(
        oca.x * axis + vec3(    c, -sa.z,  sa.y),
        oca.y * axis + vec3( sa.z,     c, -sa.x),
        oca.z * axis + vec3(-sa.y,  sa.x,     c)
    );
}

vec3 fbm(vec3 x, float H, float L, int oc) {
    vec3 v = vec3(0.0);
    float f = 1.0;
    for (int i = 0; i < 10; i++) {
        if (i >= oc) break;
        float w = pow(f, -H);
        v += noise3(x) * w;
        x *= L;
        f *= L;
    }
    return v;
}

vec3 smf(vec3 x, float H, float L, int oc, float off) {
    vec3 v = vec3(1.0);
    float f = 1.0;
    for (int i = 0; i < 10; i++) {
        if (i >= oc) break;
        v *= off + f * (noise3(x) * 2.0 - 1.0);
        f *= H;
        x *= L;
    }
    return v;
}

void main() {
    vec2 fragCoord = gl_FragCoord.xy;
  vec2 screenSize = iResolution.xy;
    vec2 screen_coords = fragCoord;
    float pixel_size = length(screenSize) / 500.0; 
    vec2 uv = (floor(screen_coords * (1.0 / pixel_size)) * pixel_size - 0.5 * screenSize) / length(screenSize) - vec2(0.0); // ← OFFSET をそのまま vec2(0.0) で
    float uv_len = length(uv);
	uv.x *= iResolution.x / iResolution.y;

    float time = iTime * 1.276;
    float slow = time * 0.002;
    uv *= 1.0 + 0.5 * slow * sin(slow * 10.0);

    float ts = time * 0.37;
    float change = 7.01;

    vec3 p = vec3(uv * 0.2, slow + change);
    vec3 axis = 4.0 * fbm(p, 0.5, 2.0, 8);
    vec3 colorVec = 0.5 * 5.0 * fbm(p * 0.3, 0.5, 2.0, 7);
    p += colorVec;

    float mag = 0.75e5;
    vec3 colorMod = mag * smf(p, 0.7, 2.0, 8, 0.2);
    colorVec += colorMod;

    colorVec = rotation(3.0 * length(axis) + slow * 10.0, normalize(axis)) * colorVec;
    colorVec *= 0.1;
    colorVec = colorVec * (1.0 + length(colorVec));
    colorVec = pow(colorVec, vec3(1.0 / 2.2));

    gl_FragColor = vec4(colorVec, 1.0);
}
`;

const material = new THREE.ShaderMaterial({
    fragmentShader,
    uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
    }
});

const geometry = new THREE.PlaneGeometry(2, 2);
const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

function animate(time) {
    material.uniforms.iTime.value = time * 0.001;
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}
animate();