
/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');
const path = require('path');

/**
 * OFFLINE UNIVERSE BUILDER (HENRY FORD EDITION)
 * Generates a 1000-node static universe snapshot for zero-cost global scaling.
 */
function generateUniverse() {
    const nodeCount = 1000;
    const edgeCount = 950;
    
    const positions = new Float32Array(nodeCount * 3);
    const nodeData = new Float32Array(nodeCount * 3);
    const intelligence = new Float32Array(nodeCount * 4);
    const edgeIndices = new Uint16Array(edgeCount * 2);

    const LANGUAGES = ['TypeScript', 'Rust', 'Python', 'Go', 'C++', 'Java', 'Zig', 'Mojo', 'Kotlin', 'Swift'];
    const GALAXY_RADIUS = 1200;

    for (let i = 0; i < nodeCount; i++) {
        const langIdx = i % LANGUAGES.length;
        const isRoot = i % 100 === 0; // Each language sector has a core pulsar
        
        // Spherical Sector Clustering
        const phi = Math.acos(-1 + (2 * langIdx) / LANGUAGES.length);
        const theta = Math.sqrt(LANGUAGES.length * Math.PI) * phi;
        
        const gx = GALAXY_RADIUS * Math.sin(phi) * Math.cos(theta);
        const gy = (langIdx - LANGUAGES.length / 2) * 200;
        const gz = GALAXY_RADIUS * Math.cos(phi);

        if (isRoot) {
            positions[i * 3] = gx + (Math.random() - 0.5) * 100;
            positions[i * 3 + 1] = gy;
            positions[i * 3 + 2] = gz + (Math.random() - 0.5) * 100;
            nodeData[i * 3] = 20 + Math.random() * 10; // Massive core
            nodeData[i * 3 + 1] = 100000 + Math.random() * 200000; // Stars
            nodeData[i * 3 + 2] = 1; // isRoot
        } else {
            const sectorRoot = i - (i % 100);
            const orbit = (i % 100);
            const r = 50 + orbit * 8;
            const angle = orbit * 0.4;
            
            positions[i * 3] = positions[sectorRoot * 3] + Math.cos(angle) * r;
            positions[i * 3 + 1] = positions[sectorRoot * 3 + 1] + Math.sin(angle * 2) * 20;
            positions[i * 3 + 2] = positions[sectorRoot * 3 + 2] + Math.sin(angle) * r;
            
            nodeData[i * 3] = 2 + Math.random() * 8;
            nodeData[i * 3 + 1] = Math.floor(Math.random() * 15000);
            nodeData[i * 3 + 2] = 0;
        }

        // Behavior signatures
        intelligence[i * 4] = 0.3 + Math.random() * 0.7; // Vitality
        intelligence[i * 4 + 1] = Math.random() > 0.92 ? 1.0 : 0.0; // Innovation Pulse
        intelligence[i * 4 + 2] = nodeData[i * 3 + 1] / 300000; // Gravity
        intelligence[i * 4 + 3] = 2010 + Math.floor(Math.random() * 16); // Year
    }

    let edgePtr = 0;
    for (let i = 0; i < nodeCount; i++) {
        if (i % 100 !== 0 && edgePtr < edgeCount) {
            edgeIndices[edgePtr * 2] = i - (i % 100); 
            edgeIndices[edgePtr * 2 + 1] = i;
            edgePtr++;
        }
    }

    const data = {
        nodeCount,
        edgeCount: edgePtr,
        positions: Array.from(positions),
        nodeData: Array.from(nodeData),
        intelligence: Array.from(intelligence),
        edgeIndices: Array.from(edgeIndices).slice(0, edgePtr * 2)
    };

    const dir = path.join(process.cwd(), 'public', 'data');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'universe.json'), JSON.stringify(data));
    console.log('MISSION SUCCESS: 1000 NODE UNIVERSE SNAPSHOT GENERATED');
}

generateUniverse();
