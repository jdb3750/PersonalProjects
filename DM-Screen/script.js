(function() {
    'use strict';

    // ==========================
    // Global Variables
    // ==========================

    // Store all relevant NPCs and Player Characters in separate objects
    const relevantNPCs = {};
    const playerCharacters = {};
    let selectedNPC = null;
    let selectedPC = null;

    // Variables for Raycasting and Mouse Events (Dice)
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let hoveredDie = null;

    // Dice Variables
    let scene, camera, renderer, world;
    const dice = [];

    // ==========================
    // Event Listeners for PDF Upload and Adventure Name Display OLD
    // ==========================

    document.getElementById('uploadButton').addEventListener('click', handlePDFUpload);

    function handlePDFUpload() {
        const fileInput = document.getElementById('fileInput');
        const file = fileInput.files[0];
        if (file) {
            document.getElementById('adventure-name').textContent = `Adventure: ${file.name}`;
            populateChecklist();
        } else {
            alert('Please upload a PDF file first.');
        }
    }

    // ==========================
    // Function to Populate Checklist with Plot Points
    // ==========================

    function populateChecklist() {
        const plotPoints = [
            'Introduction - Meet the NPC',
            'First Encounter - Goblin Ambush',
            'Find the Hidden Cave',
            'Boss Battle - Defeat the Dragon',
            'Treasure Found - Claim the Reward'
        ];

        const checklist = document.getElementById('checklistItems');
        checklist.innerHTML = ''; // Clear previous content

        plotPoints.forEach(point => {
            const li = document.createElement('li');
            li.textContent = point;
            li.classList.add('checklist-item');

            li.addEventListener('click', () => {
                li.classList.toggle('completed');
                if (li.classList.contains('completed')) {
                    addRelevantNPCs(point);
                } else {
                    removeRelevantNPCs(point);
                }
            });

            checklist.appendChild(li);
        });
    }

    // ==========================
    // NPC Data
    // ==========================

    const npcData = {
        'Introduction - Meet the NPC': [
            {
                name: 'Gorath the Brave',
                description: 'A fearless warrior with a mysterious past.',
                stats: 'HP: 50, AC: 16, STR: 18'
            }
        ],
        'Find the Hidden Cave': [
            {
                name: 'Mira the Scout',
                description: 'A skilled tracker who knows the wilderness.',
                stats: 'HP: 30, AC: 14, DEX: 16'
            }
        ]
    };

    // ==========================
    // Functions to Add and Remove NPCs Based on Checked Items
    // ==========================

    function addRelevantNPCs(checkedItem) {
        if (npcData[checkedItem]) {
            npcData[checkedItem].forEach(npc => {
                relevantNPCs[npc.name] = relevantNPCs[npc.name] || {
                    ...npc,
                    favorite: false,
                    dead: false
                };
            });
        }
        updateNPCList();
    }

    function removeRelevantNPCs(checkedItem) {
        if (npcData[checkedItem]) {
            npcData[checkedItem].forEach(npc => {
                delete relevantNPCs[npc.name];
            });
        }
        updateNPCList();
    }

    // ==========================
    // Function to Update the Visible NPC List
    // ==========================

    function updateNPCList() {
        const npcList = document.getElementById('npc-list');
        npcList.innerHTML = '';

        const sortedNPCs = Object.keys(relevantNPCs).sort();

        sortedNPCs.forEach(npcName => {
            const npc = relevantNPCs[npcName];

            const npcItem = document.createElement('div');
            npcItem.classList.add('npc-item', 'checklist-item');
            npcItem.innerHTML = `
                <span class="npc-icon star">⭐</span>
                <span class="npc-icon skull">💀</span>
                ${npc.name}
            `;

            // Add modifiers based on stored properties
            if (npc.favorite) npcItem.classList.add('favorite-highlight');
            if (npc.dead) npcItem.classList.add('sketchy-strikethrough');

            const star = npcItem.querySelector('.star');
            const skull = npcItem.querySelector('.skull');

            // Sync star and skull icons with state
            if (npc.favorite) star.classList.add('favorite');
            if (npc.dead) skull.classList.add('dead');

            // Star click toggle
            star.addEventListener('click', function (e) {
                e.stopPropagation();
                npc.favorite = !npc.favorite;
                this.classList.toggle('favorite');
                npcItem.classList.toggle('favorite-highlight', npc.favorite);
            });

            // Skull click toggle
            skull.addEventListener('click', function (e) {
                e.stopPropagation();
                npc.dead = !npc.dead;
                this.classList.toggle('dead');
                npcItem.classList.toggle('sketchy-strikethrough', npc.dead);
            });

            npcItem.addEventListener('click', () => {
                selectNPC(npcItem, npc);
            });

            npcList.appendChild(npcItem);
        });
    }

    // ==========================
    // Functions to Handle NPC Selection and Show Details
    // ==========================

    function selectNPC(npcItem, npc) {
        if (selectedNPC === npcItem) {
            npcItem.classList.remove('npc-selected');
            selectedNPC = null;
            clearNPCDetails();
        } else {
            if (selectedNPC) selectedNPC.classList.remove('npc-selected');
            npcItem.classList.add('npc-selected');
            selectedNPC = npcItem;
            showNPCDetails(npc);
        }
    }

    function showNPCDetails(npc) {
        const npcDetails = document.getElementById('npc-details');
        npcDetails.innerHTML = `
            <h3>${npc.name}</h3>
            <p>${npc.description}</p>
            <p><strong>Stats:</strong> ${npc.stats}</p>
        `;
    }

    function clearNPCDetails() {
        const npcDetails = document.getElementById('npc-details');
        npcDetails.innerHTML = '';
    }

    // ==========================
    // Event Listeners for Creating New Player Character
    // ==========================

    document.getElementById('create-character-btn').addEventListener('click', () => {
        document.getElementById('character-form').style.display = 'block';
        document.getElementById('create-character-btn').style.display = 'none';
    });

    document.getElementById('close-btn').addEventListener('click', () => {
        document.getElementById('character-form').style.display = 'none';
        document.getElementById('create-character-btn').style.display = 'block';
    });

    document.getElementById('character-form').addEventListener('submit', handleCharacterFormSubmit);

    function handleCharacterFormSubmit(e) {
        e.preventDefault();

        const character = {
            name: document.getElementById('name').value,
            race: document.getElementById('race').value,
            level: document.getElementById('level').value,
            class: document.getElementById('class').value
        };

        addCharacterToList(character);
        e.target.reset();
        e.target.style.display = 'none';
        document.getElementById('create-character-btn').style.display = 'block';
    }

    // ==========================
    // Functions to Handle Player Characters
    // ==========================

    function addCharacterToList(character) {
        playerCharacters[character.name] = character;
        updatePCList();
    }

    function updatePCList() {
        const pcList = document.getElementById('pc-list');
        pcList.innerHTML = '';

        const sortedCharacters = Object.keys(playerCharacters).sort();

        sortedCharacters.forEach(charName => {
            const character = playerCharacters[charName];
            const characterItem = document.createElement('div');
            characterItem.classList.add('pc-item', 'checklist-item');
            characterItem.textContent = `${character.name} - ${character.race} - Level ${character.level} ${character.class}`;

            characterItem.addEventListener('click', () => {
                selectPC(characterItem, character);
            });

            pcList.appendChild(characterItem);
        });
    }

    function selectPC(characterItem, character) {
        if (selectedPC === characterItem) {
            characterItem.classList.remove('npc-selected');
            selectedPC = null;
            clearPCDetails();
        } else {
            if (selectedPC) selectedPC.classList.remove('npc-selected');
            characterItem.classList.add('npc-selected');
            selectedPC = characterItem;
            showCharacterDetails(character);
        }
    }

    function showCharacterDetails(character) {
        const pcDetails = document.getElementById('pc-details');
        pcDetails.innerHTML = `
            <h3>${character.name}</h3>
            <p><strong>Race:</strong> ${character.race}</p>
            <p><strong>Level:</strong> ${character.level}</p>
            <p><strong>Class:</strong> ${character.class}</p>
        `;
    }

    function clearPCDetails() {
        const pcDetails = document.getElementById('pc-details');
        pcDetails.innerHTML = '';
    }

    // ==========================
    // Dice Logic and Functions
    // ==========================

    // Dice Selector Logic
    document.querySelectorAll('.dice-button').forEach(button => {
        button.addEventListener('click', () => {
            const dieType = button.textContent.toLowerCase(); // Use the text content as die type (e.g., d6)
            addDieToRoller(dieType); // Add a new die to the roller
        });
    });

    function addDieToRoller(dieType) {
        const sizeMap = {
            d4: 0.5,
            d6: 1,
            d8: 0.8,
            d10: 0.9,
            d12: 0.85,
            d20: 1.2,
            d100: 1.5
        };

        let dieGeometry;
        switch (dieType) {
            case 'd4':
                dieGeometry = new THREE.TetrahedronGeometry(sizeMap[dieType]);
                break;
            case 'd6':
                dieGeometry = new THREE.BoxGeometry(sizeMap[dieType], sizeMap[dieType], sizeMap[dieType]);
                break;
            case 'd8':
                dieGeometry = new THREE.OctahedronGeometry(sizeMap[dieType]);
                break;
            case 'd10':
                dieGeometry = new THREE.DodecahedronGeometry(sizeMap[dieType] * 0.8);
                break;
            case 'd12':
                dieGeometry = new THREE.DodecahedronGeometry(sizeMap[dieType]);
                break;
            case 'd20':
                dieGeometry = new THREE.IcosahedronGeometry(sizeMap[dieType]);
                break;
            case 'd100':
                dieGeometry = new THREE.SphereGeometry(sizeMap[dieType], 16, 16);
                break;
            default:
                console.warn(`Unknown die type: ${dieType}`);
                return;
        }

        const dieMaterial = new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff });
        const dieMesh = new THREE.Mesh(dieGeometry, dieMaterial);

        let dieBody;
        if (['d4', 'd8', 'd10', 'd12', 'd20', 'd100'].includes(dieType)) {
            const radius = sizeMap[dieType];
            dieBody = new CANNON.Body({ mass: 3, shape: new CANNON.Sphere(radius) });
        } else {
            dieBody = new CANNON.Body({ mass: 3 });
            dieBody.addShape(
                new CANNON.Box(
                    new CANNON.Vec3(sizeMap[dieType] / 2, sizeMap[dieType] / 2, sizeMap[dieType] / 2)
                )
            );
        }

        dieBody.linearDamping = 0.4;
        dieBody.angularDamping = 0.5;
        dieBody.position.set(Math.random() * 2 - 1, 2, Math.random() * 2 - 1);
        world.addBody(dieBody);
        scene.add(dieMesh);

        // Store the type of the die
        const dieObject = { mesh: dieMesh, body: dieBody, type: dieType };
        dice.push(dieObject);
    }

    // ==========================
    // Three.js and Cannon.js Setup for Dice Simulation
    // ==========================

    function init() {
        const canvas = document.getElementById('dice-canvas');

        // Scene Setup
        scene = new THREE.Scene();

        // Create the Cannon.js World
        world = new CANNON.World();
        world.gravity.set(0, -9.81, 0); // Set gravity for the world

        // Create Materials
        const diceMaterial = new CANNON.Material('diceMaterial');
        const groundMaterial = new CANNON.Material('groundMaterial');

        // Define friction and restitution
        const contactMaterial = new CANNON.ContactMaterial(diceMaterial, groundMaterial, {
            friction: 0.7, // Increase friction to prevent sliding
            restitution: 0.1 // Low restitution to reduce bounce
        });

        world.addContactMaterial(contactMaterial);

        // Create a Ground Plane
        const groundBody = new CANNON.Body({ mass: 0, material: groundMaterial });
        groundBody.addShape(new CANNON.Plane());
        groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
        world.addBody(groundBody);

        // Set up Orthographic Camera
        const aspect = canvas.clientWidth / canvas.clientHeight;
        const viewSize = 20;
        camera = new THREE.OrthographicCamera(
            (-aspect * viewSize) / 2,
            (aspect * viewSize) / 2,
            viewSize / 2,
            -viewSize / 2,
            -100,
            100
        );
        camera.position.set(0, 15, 0);
        camera.lookAt(new THREE.Vector3(0, 0, 0));

        // Renderer
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
        renderer.setClearColor(0x000000, 0);
        renderer.setSize(canvas.clientWidth, canvas.clientHeight);

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
        directionalLight.position.set(5, 10, 7.5);
        scene.add(directionalLight);

        // Create Boundaries
        createDiceBoundaries();

        // Animate the Scene
        animate();
    }

    function createDiceBoundaries() {
        const canvas = document.getElementById('dice-canvas');
        const canvasRect = canvas.getBoundingClientRect();
        const canvasWidth = canvasRect.width;
        const canvasHeight = canvasRect.height;

        const pixelsToUnits = 10 / canvasHeight;
        const boundaryWidth = (canvasWidth * pixelsToUnits) / 2;
        const sideBoundaryWidth = boundaryWidth * 2;
        const boundaryHeight = 20;
        const wallThickness = 6;

        const wallPositions = [
            { x: 0, y: boundaryHeight / 2, z: -boundaryWidth },
            { x: 0, y: boundaryHeight / 2, z: boundaryWidth },
            { x: -sideBoundaryWidth, y: boundaryHeight / 2, z: 0 },
            { x: sideBoundaryWidth, y: boundaryHeight / 2, z: 0 }
        ];

        wallPositions.forEach((pos, index) => {
            const isVertical = index < 2;
            const wallShape = new CANNON.Box(
                new CANNON.Vec3(
                    isVertical ? boundaryWidth + wallThickness : wallThickness,
                    boundaryHeight / 2,
                    isVertical ? wallThickness : sideBoundaryWidth + wallThickness
                )
            );

            const wallBody = new CANNON.Body({ mass: 0 });
            wallBody.addShape(wallShape);
            wallBody.position.set(pos.x, pos.y, pos.z);
            world.addBody(wallBody);
        });

        // Ceiling
        const ceilingBody = new CANNON.Body({ mass: 0 });
        const ceilingShape = new CANNON.Plane();
        ceilingBody.addShape(ceilingShape);
        ceilingBody.position.set(0, boundaryHeight, 0);
        ceilingBody.quaternion.setFromEuler(Math.PI / 2, 0, 0);
        world.addBody(ceilingBody);
    }

    // ==========================
    // Function to Animate the Scene
    // ==========================

    function animate() {
        requestAnimationFrame(animate);
        world.step(1 / 60); // Step the physics world

        // Sync Three.js meshes with Cannon.js bodies
        dice.forEach(die => {
            die.mesh.position.copy(die.body.position);
            die.mesh.quaternion.copy(die.body.quaternion);
        });

        renderer.render(scene, camera);
    }

    // ==========================
    // Function to Roll Dice
    // ==========================

    function rollDice() {
        const rollForce = 20;
        const rollTorque = 30;

        dice.forEach(die => {
            die.body.velocity.set(0, 0, 0);
            die.body.angularVelocity.set(0, 0, 0);

            die.body.velocity.set(
                (Math.random() - 0.5) * rollForce,
                3,
                (Math.random() - 0.5) * rollForce
            );

            die.body.angularVelocity.set(
                (Math.random() - 0.5) * rollTorque,
                (Math.random() - 0.5) * rollTorque,
                (Math.random() - 0.5) * rollTorque
            );
        });

        // Display the total roll result after the dice settle
        setTimeout(showTotalRollResult, 1500);
    }

    // Function to get the maximum roll value based on the die's type
    function getMaxRoll(dieType) {
        switch (dieType) {
            case 'd4':
                return 4;
            case 'd6':
                return 6;
            case 'd8':
                return 8;
            case 'd10':
                return 10;
            case 'd12':
                return 12;
            case 'd20':
                return 20;
            case 'd100':
                return 100;
            default:
                return 6;
        }
    }

    // Function to Display Total Roll Result
    function showTotalRollResult() {
        // Clear existing roll results
        const existingResult = document.getElementById('total-roll-result');
        if (existingResult) existingResult.remove();

        let totalResult = 0;
        dice.forEach(die => {
            const maxRoll = getMaxRoll(die.type);
            const result = Math.floor(Math.random() * maxRoll) + 1;
            totalResult += result;

            // Stop the die's motion
            die.body.velocity.set(0, 0, 0);
            die.body.angularVelocity.set(0, 0, 0);
        });

        // Create result display
        const totalResultDisplay = document.createElement('div');
        totalResultDisplay.id = 'total-roll-result';
        totalResultDisplay.textContent = totalResult;

        // Apply styling
        Object.assign(totalResultDisplay.style, {
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '4rem',
            fontFamily: 'Georgia, serif',
            fontStyle: 'italic',
            color: '#ecf0f1',
            textShadow: '2px 2px 8px rgba(0, 0, 0, 0.7)'
        });

        // Append to dice container
        const diceContainer = document.getElementById('dice-container');
        if (diceContainer) {
            diceContainer.appendChild(totalResultDisplay);
        }
    }

    // ==========================
    // Function to Remove All Dice
    // ==========================

    function clearAllDice() {
        // Remove all dice
        dice.forEach(die => {
            world.removeBody(die.body);
            scene.remove(die.mesh);
        });

        dice.length = 0; // Clear the dice array

        // Remove total roll result
        const existingResult = document.getElementById('total-roll-result');
        if (existingResult) existingResult.remove();

        console.log('All dice and results cleared!');
    }

    // ==========================
    // Event Listeners for Dice Actions
    // ==========================

    document.getElementById('roll-button').addEventListener('click', rollDice);
    document.getElementById('clear-button').addEventListener('click', clearAllDice);

    // Event Listeners for Dice Canvas (Clicks and Hovers)
    const canvas = document.getElementById('dice-canvas');
    canvas.addEventListener('click', onCanvasClick);
    canvas.addEventListener('mousemove', onCanvasHover);

    // ==========================
    // Functions for Raycasting on Clicks and Hovers (Dice)
    // ==========================

    function onCanvasClick(event) {
        updateMousePosition(event);

        raycaster.setFromCamera(mouse, camera);

        const intersects = raycaster.intersectObjects(scene.children);

        if (intersects.length > 0) {
            const clickedObject = intersects[0].object;

            // Check if the clicked object is a die
            const dieObject = dice.find(die => die.mesh === clickedObject);
            if (dieObject) {
                removeDie(dieObject);
            }
        }
    }

    function removeDie(dieObject) {
        world.removeBody(dieObject.body);
        scene.remove(dieObject.mesh);
        const index = dice.indexOf(dieObject);
        if (index > -1) {
            dice.splice(index, 1);
        }
        console.log(`Removed die: ${dieObject.mesh.uuid}`);
    }

    function onCanvasHover(event) {
        updateMousePosition(event);

        raycaster.setFromCamera(mouse, camera);

        const intersects = raycaster.intersectObjects(scene.children);

        if (intersects.length > 0) {
            const hoveredObject = intersects[0].object;

            const dieObject = dice.find(die => die.mesh === hoveredObject);
            if (dieObject && dieObject.mesh !== hoveredDie) {
                if (hoveredDie) unhighlightDie(hoveredDie);

                hoveredDie = dieObject.mesh;
                highlightDie(hoveredDie);
            }
        } else {
            if (hoveredDie) unhighlightDie(hoveredDie);
            hoveredDie = null;
        }
    }

    function updateMousePosition(event) {
        const rect = canvas.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    function highlightDie(dieMesh) {
        dieMesh.scale.set(1.2, 1.2, 1.2);
        dieMesh.material.emissive = new THREE.Color(0xaaaaaa);
    }

    function unhighlightDie(dieMesh) {
        dieMesh.scale.set(1, 1, 1);
        dieMesh.material.emissive = new THREE.Color(0x000000);
    }

    // ==========================
    // Initialize the Application
    // ==========================

    init();
})();
