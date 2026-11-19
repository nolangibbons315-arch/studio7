
 // =============================================================
 // AR MODEL VIEWER
 // MindAR + Three.js
 // Static 3D Model with Keyboard, Touch and Mouse Controls
 // =============================================================


// 1. IMPORTS
import * as THREE from "three";
import { MindARThree } from "mindar-image-three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";


// 2. SETTINGS
const TARGET_FILE = "./assets/marker.mind";
const MODEL_FILE = "./assets/model.glb";

const TARGET_INDEX = 0;

const MODEL_SIZE = 0.5;

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;

const ROTATION_SPEED = 0.01;
const KEY_ROTATION_SPEED = 0.05;
const KEY_ZOOM_SPEED = 1.1;


// 3. HTML ELEMENTS
const startButton = document.querySelector("#start-button");
const resetButton = document.querySelector("#reset-button");
const statusMessage = document.querySelector(".ar-message");


// 4. VARIABLES
let mindarThree;
let model;

let originalScale = 1;
let zoom = 1;

let isARStarted = false;
let isModelLoaded = false;


// 5. CREATE AR ENGINE
mindarThree = new MindARThree({
    container: document.querySelector("#ar-container"),
    imageTargetSrc: TARGET_FILE,
    maxTrack: 1
});

const { renderer, scene, camera } = mindarThree;


// 6. LIGHTING
const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(0, 1, 2);
scene.add(directionalLight);


// 7. LOAD 3D MODEL
const loadModel = () => {

    return new Promise((resolve, reject) => {

        const loader = new GLTFLoader();

        loader.load(
            MODEL_FILE,

            (gltf) => {

                model = gltf.scene;

                // Calculate model dimensions
                const box = new THREE.Box3().setFromObject(model);
                const size = box.getSize(new THREE.Vector3());

                // Find the largest dimension
                const maxDimension = Math.max(
                    size.x,
                    size.y,
                    size.z
                );

                // Calculate starting scale
                if (maxDimension > 0) {
                    originalScale = MODEL_SIZE / maxDimension;
                }

                model.scale.setScalar(originalScale);

                // Center the model
                const center = box.getCenter(new THREE.Vector3());

                model.position.set(
                    -center.x * originalScale,
                    -center.y * originalScale,
                    -center.z * originalScale
                );

                // Attach model to image marker
                const anchor = mindarThree.addAnchor(TARGET_INDEX);
                anchor.group.add(model);

                // Marker detected
                anchor.onTargetFound = () => {
                    statusMessage.textContent =
                        "Drag to rotate - Pinch to zoom";
                };

                // Marker lost
                anchor.onTargetLost = () => {
                    statusMessage.textContent =
                        "Point the camera at the image";
                };

                isModelLoaded = true;
                resetButton.disabled = false;

                resolve();

            },

            undefined,

            (error) => {
                reject(error);
            }
        );

    });

};


// 8. RESET MODEL VIEW
const resetModelView = () => {

    if (!model) return;

    // Reset rotation
    model.rotation.set(0, 0, 0);

    // Reset zoom
    zoom = 1;
    model.scale.setScalar(originalScale);

};


// 9. TOUCH AND MOUSE CONTROLS
const setupModelControls = () => {

    const arContainer = document.querySelector("#ar-container");

    const pointers = new Map();

    let lastX = 0;
    let lastY = 0;
    let lastDistance = 0;


    // Calculate distance between two fingers
    const getDistance = () => {

        const points = [...pointers.values()];

        if (points.length < 2) return 0;

        return Math.hypot(
            points[0].x - points[1].x,
            points[0].y - points[1].y
        );

    };


    // Update zoom
    const setZoom = (value) => {

        zoom = Math.max(
            MIN_ZOOM,
            Math.min(MAX_ZOOM, value)
        );

        model.scale.setScalar(originalScale * zoom);

    };


    // Finger or mouse touches the AR area
    arContainer.addEventListener("pointerdown", (event) => {

        if (!model) return;

        event.preventDefault();

        pointers.set(event.pointerId, {
            x: event.clientX,
            y: event.clientY
        });

        if (pointers.size === 1) {

            lastX = event.clientX;
            lastY = event.clientY;

        }

        if (pointers.size === 2) {

            lastDistance = getDistance();

        }

    });


    // Finger or mouse moves
    arContainer.addEventListener("pointermove", (event) => {

        if (!pointers.has(event.pointerId)) return;

        event.preventDefault();

        pointers.set(event.pointerId, {
            x: event.clientX,
            y: event.clientY
        });


        // ONE FINGER: ROTATE MODEL
        if (pointers.size === 1) {

            const deltaX = event.clientX - lastX;
            const deltaY = event.clientY - lastY;

            model.rotation.y += deltaX * ROTATION_SPEED;
            model.rotation.x += deltaY * ROTATION_SPEED;

            lastX = event.clientX;
            lastY = event.clientY;

        }


        // TWO FINGERS: PINCH TO ZOOM
        else if (pointers.size === 2) {

            const currentDistance = getDistance();

            if (lastDistance > 0) {

                const zoomFactor = currentDistance / lastDistance;

                setZoom(zoom * zoomFactor);

            }

            lastDistance = currentDistance;

        }

    });


    // Release finger or mouse
    const releasePointer = (event) => {

        pointers.delete(event.pointerId);

        if (pointers.size === 1) {

            const remainingPointer = [...pointers.values()][0];

            lastX = remainingPointer.x;
            lastY = remainingPointer.y;

        }

        if (pointers.size === 2) {

            lastDistance = getDistance();

        }

    };


    arContainer.addEventListener("pointerup", releasePointer);
    arContainer.addEventListener("pointercancel", releasePointer);


    // MOUSE WHEEL: ZOOM
    arContainer.addEventListener("wheel", (event) => {

        if (!model) return;

        event.preventDefault();

        if (event.deltaY < 0) {

            setZoom(zoom * 1.1);

        } else {

            setZoom(zoom * 0.9);

        }

    }, { passive: false });

};


// 10. KEYBOARD CONTROLS
const setupKeyboardControls = () => {

    window.addEventListener("keydown", (event) => {

        if (!model) return;

        const key = event.key.toLowerCase();

        // Prevent page scrolling when using control keys
        if (["a", "d", "w", "s", "z", "x"].includes(key)) {
            event.preventDefault();
        }

        switch (key) {

            // A: TURN LEFT
            case "a":
                model.rotation.y -= KEY_ROTATION_SPEED;
                break;

            // D: TURN RIGHT
            case "d":
                model.rotation.y += KEY_ROTATION_SPEED;
                break;

            // W: TURN UP
            case "w":
                model.rotation.x -= KEY_ROTATION_SPEED;
                break;

            // S: TURN DOWN
            case "s":
                model.rotation.x += KEY_ROTATION_SPEED;
                break;

            // Z: ZOOM IN
            case "z":
                zoom = Math.min(
                    MAX_ZOOM,
                    zoom * KEY_ZOOM_SPEED
                );

                model.scale.setScalar(originalScale * zoom);
                break;

            // X: ZOOM OUT
            case "x":
                zoom = Math.max(
                    MIN_ZOOM,
                    zoom / KEY_ZOOM_SPEED
                );

                model.scale.setScalar(originalScale * zoom);
                break;

        }

    });

};


// 11. START AR
const startAR = async () => {

    try {

        startButton.disabled = true;
        startButton.textContent = "Loading...";

        statusMessage.textContent = "Loading 3D model...";


        // Load model once
        if (!isModelLoaded) {

            await loadModel();

            setupModelControls();
            setupKeyboardControls();

        }


        statusMessage.textContent = "Starting camera...";


        // Start camera and image tracking
        if (!isARStarted) {

            await mindarThree.start();

            renderer.setAnimationLoop(() => {

                renderer.render(scene, camera);

            });

            isARStarted = true;

        }


        startButton.textContent = "AR Started";

        statusMessage.textContent =
            "Point the camera at the image";


    } catch (error) {

        console.error("AR failed to start:", error);

        statusMessage.textContent =
            "AR could not start. Check camera permission.";

        startButton.disabled = false;
        startButton.textContent = "Start AR";

    }

};


// 12. BUTTON EVENTS
startButton.addEventListener("click", startAR);

resetButton.addEventListener("click", resetModelView);
