
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('orrery') });
renderer.setSize(window.innerWidth, window.innerHeight);
camera.position.z = 100;


scene.rotation.x = Math.PI / 2;


const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; 
controls.dampingFactor = 0.25; 

// This restricts the vertical movement to avoid clipping
controls.minPolarAngle = 0;      
controls.maxPolarAngle = Math.PI / 2; 
controls.screenSpacePanning = false;


const sunGeometry = new THREE.SphereGeometry(5, 32, 32);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00, emissive: 0xffcc00 });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

// Create Earth
const earthGeometry = new THREE.SphereGeometry(1, 32, 32);
const earthMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
const earth = new THREE.Mesh(earthGeometry, earthMaterial);
scene.add(earth);


const earthOrbitRadius = 30;
const earthOrbitCurve = new THREE.EllipseCurve(0, 0, earthOrbitRadius, earthOrbitRadius, 0, 2 * Math.PI);
const earthOrbitPoints = earthOrbitCurve.getPoints(100);
const earthOrbitGeometry = new THREE.BufferGeometry().setFromPoints(earthOrbitPoints);
const earthOrbitMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
const earthOrbitLine = new THREE.Line(earthOrbitGeometry, earthOrbitMaterial);

scene.add(earthOrbitLine);


let neos = [];
let neoRenderLimit = 1000;  // Add to your hearts content. can do the level of detail shit for better performance but too lazy to do that for space apps challenge
let renderedNEOs = 0;  


function addNEO(a, e, i, omega, Omega, M0, period, size = 0.5) {
    if (renderedNEOs >= neoRenderLimit) {
        console.log(`Rendering limit of ${neoRenderLimit} NEOs reached`);
        return;
    }

    const neoGeometry = new THREE.SphereGeometry(size, 16, 16);
    const neoMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const neo = new THREE.Mesh(neoGeometry, neoMaterial);

    // Add NEO to the scene
    scene.add(neo);

    // Add NEO to the neos array with its orbital parameters
    neos.push({
        mesh: neo,
        a: a,
        e: e,
        i: i,
        omega: omega,
        Omega: Omega,
        M0: M0,
        period: period,
        startTime: Date.now()  // Track when the NEO was added
    });

    renderedNEOs++;  // Increment rendered NEOs count
    console.log(`Added NEO with semi-major axis ${a} AU to the scene`);
}

// Speed control variables, doesn't work as expected for NEO's, fix it if you want to
let speedMultiplier = 1;
let lastTime = Date.now();

document.getElementById('realtime').addEventListener('click', () => {
    speedMultiplier = 1;
});

document.getElementById('speed2x').addEventListener('click', () => {
    speedMultiplier = 2;
});

document.getElementById('speed100x').addEventListener('click', () => {
    speedMultiplier = 100;
});


function calculatePosition(neo, t) {
    const a = neo.a;
    const e = neo.e;
    const i = neo.i;
    const omega = neo.omega;
    const Omega = neo.Omega;
    const M0 = neo.M0;
    const period = neo.period;

    // Calculate the elapsed time since the initial epoch for this NEO
    const elapsedTime = t % period; 

    // Mean anomaly
    const M = M0 + (2 * Math.PI / period) * elapsedTime;

    // Eccentric anomaly (solving Kepler's equation)
    let E = M;
    for (let j = 0; j < 5; j++) {
        E = M + e * Math.sin(E);
    }

    // True anomaly calculation, atan2 is used to determine the correct quadrant to place the NEO in the orbit
    const v = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
    const r = a * (1 - e * Math.cos(E));

    const x_orb = r * Math.cos(v);
    const y_orb = r * Math.sin(v);

    // For the Rotation effects; remove this if you want to stablize the NEO's, I just added to look cool
    const x = x_orb * (Math.cos(omega) * Math.cos(Omega) - Math.sin(omega) * Math.sin(Omega) * Math.cos(i)) -
              y_orb * (Math.sin(omega) * Math.cos(Omega) + Math.cos(omega) * Math.sin(Omega) * Math.cos(i));
    const y = x_orb * (Math.cos(omega) * Math.sin(Omega) + Math.sin(omega) * Math.cos(Omega) * Math.cos(i)) +
              y_orb * (Math.cos(omega) * Math.cos(Omega) * Math.cos(i) - Math.sin(omega) * Math.sin(Omega));
    const z = x_orb * (Math.sin(omega) * Math.sin(i)) + y_orb * (Math.cos(omega) * Math.sin(i));

    return { x: x, y: y, z: z };
}

function animate() {
    requestAnimationFrame(animate);

    const currentTime = Date.now();
    const deltaTime = (currentTime - lastTime) * speedMultiplier;
    lastTime = currentTime;

    const earthOrbitSpeed = 0.001 * speedMultiplier;
    earth.position.x = earthOrbitRadius * Math.cos(Date.now() * earthOrbitSpeed);
    earth.position.y = earthOrbitRadius * Math.sin(Date.now() * earthOrbitSpeed);

    // Update each NEO's position based on Keplerian orbital elements
    neos.forEach(function(neo) {
        const elapsedSeconds = (currentTime - neo.startTime) / 1000; 
        const pos = calculatePosition(neo, elapsedSeconds);  
        neo.mesh.position.set(pos.x * 50, pos.y * 50, pos.z * 50); 
    });

    controls.update();
    renderer.render(scene, camera);
}
animate();


const apiKey = 'ekYUoqtjm9gnrDtHCKAV8pTJ3AeqiE82qNPJtW1k';  // Registered in my name; create a org account if this hits limit
let page = 1;
let totalNEOs = 0;
let totalPages = 0;


function fetchAllNEOs() {
    if (renderedNEOs >= neoRenderLimit) return;

    $.get(`https://api.nasa.gov/neo/rest/v1/neo/browse?page=${page}&size=20&api_key=${apiKey}`, function(data) {
        console.log(`Fetched page ${page}`);
        totalNEOs += data.page.size;
        totalPages = data.page.total_pages;

        const neos = data.near_earth_objects;
        neos.forEach(function(neo) {
            const neoId = neo.id;

            $.get(`http://localhost:3000/api/sbdb?sstr=${neoId}`, function(orbitalData) {
                const elements = orbitalData.orbit.elements;

               
                const a = parseFloat(elements.find(el => el.name === 'a').value);  // Semi-major axis in AU
                const e = parseFloat(elements.find(el => el.name === 'e').value);  // Eccentricity
                const i = degToRad(parseFloat(elements.find(el => el.name === 'i').value));  // Inclination in radians
                const omega = degToRad(parseFloat(elements.find(el => el.name === 'w').value));  // Argument of periapsis
                const Omega = degToRad(parseFloat(elements.find(el => el.name === 'om').value));  // Longitude of ascending node
                const M0 = degToRad(parseFloat(elements.find(el => el.name === 'ma').value));  // Mean anomaly at epoch
                const period = parseFloat(elements.find(el => el.name === 'per').value);  // Orbital period in days

                // Add NEO to the scene
                addNEO(a, e, i, omega, Omega, M0, period);
            }).fail(function(jqXHR, textStatus, errorThrown) {
                console.error(`Failed to fetch orbital data for NEO ID ${neoId}: ${textStatus}, ${errorThrown}`);
            });
        });

        // Fetch next page if available and rendering limit not reached
        if (page < totalPages && renderedNEOs < neoRenderLimit) {
            page++;
            fetchAllNEOs();  
        } else {
            console.log(`Loaded ${totalNEOs} NEOs.`);
        }
    }).fail(function(jqXHR, textStatus, errorThrown) {
        console.error(`Failed to fetch NEO data: ${textStatus}, ${errorThrown}`);
    });
}

fetchAllNEOs();

function degToRad(degrees) {
    return degrees * (Math.PI / 180);
}
