let yolo_model;
let frameCount = 0;
let lastTime = Date.now();
// let peopleCount = 0;
const stopButton = document.getElementById('stopBtn');
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const startButton = document.getElementById('startBtn');
const sourceButton = document.getElementById('sourceBtn');
const resetButton = document.getElementById('resetBtn')
const ctx = canvas.getContext('2d');
let countingZone = { x: 320, y: 240, width: 1200, height: 800 };
let trackedPersons = {};
let nextPersonId = 1;
let totalParticipants = 0;
let currentParticipants = 0;
const maxDisplacement = 400;
const maxTrackAge = 3;
let isProcessingActive = false;
let currentSource = 'video';
const FIVE_MINUTES = 5 * 60;
const currentDateTime = new Date();
const day = currentDateTime.getDate();
const month = currentDateTime.getMonth();
const year = currentDateTime.getFullYear();
const hours = currentDateTime.getHours();
const minutes = currentDateTime.getMinutes();
const seconds = currentDateTime.getSeconds();
const time = day + ":" + month + ":" + year + ":" + hours + ":" + minutes + ":" + seconds;

let personCount = 0;



/* const syncInterval = setInterval(() => {
    // Generate the current ISO timestamp right before sending

    sendToBackend(countIn, countLeft, time);
}, FIVE_MINUTES); */

const syncInterval = setInterval(() => {
    sender(totalParticipants);
}, FIVE_MINUTES);

async function checkSession() {
    try {
        const response = await fetch('get_session.php');
        const sessionData = await response.json();

        console.log("Fetched session data:", sessionData);

        if (sessionData.total_participants) {
            console.log("Total:", sessionData.total_participants);
            personCount = sessionData.total_participants;
        }
    } catch (error) {
        console.error("Error fetching session:", error);
    }
}

function getFormattedTime() {
    const now = new Date();

    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are zero-indexed
    const year = now.getFullYear();

    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `${day}:${month}:${year}:${hours}:${minutes}:${seconds}`;
}

function sender(personCount) {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', 'sender.php', true);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');

    // Send totalParticipants count
    xhr.send(`totalParticipants=${personCount}&Time=${getFormattedTime()}`);
}

resetButton.addEventListener('click', function () {
    const payload = {
        Command: 'Reset'
    };

    fetch('reset_event_counter.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
        .then(response => {
            // 2. Explicitly handle server-side errors (4xx, 5xx)
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.status === 'success') {
                console.log('Success:', data.message);
                // Insert UI update logic here (e.g., changing counter display to 0)
            } else {
                console.warn('Application Warning:', data.message);
            }
        })
        .catch(error => {
            // Catches both network failures AND errors thrown from the response block above
            console.error('Error communicating with PHP:', error.message);
        });
    location.reload();
});


stopButton.addEventListener('click', function () {

    isProcessingActive = false;

    video.pause();

})

sourceButton.addEventListener('click', async () => {

    if (currentSource === 'video') {
        currentSource = 'live_cam';
        sourceButton.textContent = "Switch to Video File";
    } else {
        currentSource = 'video';
        sourceButton.textContent = "Switch to Live Cam";
    }

    try {
        await setupCamera();
        isProcessingActive = false;

    } catch (err) {
        console.error("Failed to switch media source:", err);
    }
});

function stopCurrentStream() {
    if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
        video.srcObject = null;
    }
    video.removeAttribute('src');
    video.load();
}

async function setupCamera() {
    stopCurrentStream();

    if (currentSource === 'video') {
        return new Promise((resolve, reject) => {
            video.crossOrigin = 'anonymous';
            video.loop = true;

            video.onloadedmetadata = () => {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
            };

            video.oncanplaythrough = async () => {
                try {

                    resolve(video);
                } catch (err) {
                    reject(new Error("Playback blocked: " + err.message));
                }
            };

            video.onerror = () => {
                reject(new Error("Failed to load video file."));
            };

            video.src = 'video/people_walking.mp4';
        });
    } else {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
                audio: false
            });

            return new Promise((resolve, reject) => {
                video.srcObject = stream;

                video.onloadeddata = async () => {
                    try {
                        canvas.width = video.videoWidth;
                        canvas.height = video.videoHeight;
                        await video.play();
                        resolve(video);
                    } catch (err) {
                        reject(new Error("Playback failed: " + err.message));
                    }
                };

                video.onerror = () => {
                    reject(new Error("Video element error occurred."));
                };
            });
        } catch (error) {
            console.error("Error accessing camera:", error);
            throw error;
        }
    }
}

function setupZoneControls() {
    const inputX = document.getElementById('zoneX');
    const inputY = document.getElementById('zoneY');
    const inputW = document.getElementById('zoneW');
    const inputH = document.getElementById('zoneH');
    const inputAngle = document.getElementById('zoneAngle');

    function updateZone() {
        countingZone.x = parseInt(inputX.value, 10) || 0;
        countingZone.y = parseInt(inputY.value, 10) || 0;
        countingZone.width = parseInt(inputW.value, 10) || 0;
        countingZone.height = parseInt(inputH.value, 10) || 0;
        countingZone.angle = parseInt(inputAngle.value, 10) || 0;

        // Calculate center line coordinates (Vertical split)
        const centerX = countingZone.x + (countingZone.width / 2);

        countingZone.centerLine = {
            x1: centerX,
            y1: countingZone.y,
            x2: centerX,
            y2: countingZone.y + countingZone.height
        };

        // force a redraw so the box moves instantly
        if (!isProcessingActive) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            drawCountingZone();
        }
    }

    inputX.addEventListener('input', updateZone);
    inputY.addEventListener('input', updateZone);
    inputW.addEventListener('input', updateZone);
    inputH.addEventListener('input', updateZone);
    inputAngle.addEventListener('input', updateZone);
}

function drawCountingZone() {
    const centerX = countingZone.x + (countingZone.width / 2);
    const centerY = countingZone.y + (countingZone.height / 2);
    const angleInRadians = ((countingZone.angle || 0) * Math.PI) / 180;

    ctx.save();

    // Apply rotation around center
    ctx.translate(centerX, centerY);
    ctx.rotate(angleInRadians);
    ctx.translate(-centerX, -centerY);

    // Bounding Box
    ctx.strokeStyle = 'green';
    ctx.lineWidth = 4;
    ctx.strokeRect(countingZone.x, countingZone.y, countingZone.width, countingZone.height);

    ctx.stroke();

    ctx.restore();
}

/* function isInsideCountingZone(x, y) {
    return x > countingZone.x && x < countingZone.x + countingZone.width &&
        y > countingZone.y && y < countingZone.y + countingZone.height;
}*/

async function loadModel() {
    document.getElementById('status').innerText = 'Loading Model...';

    try {
        const modelUrl = 'exp.onnx';

        // Set WASM multi-threading options to boost performance if GPU fails
        ort.env.wasm.numThreads = Math.min(4, navigator.hardwareConcurrency || 2);

        const options = {
            // Priority order for hardware acceleration
            executionProviders: ['webgpu', 'webgl', 'wasm'],
            // Enable graph optimization for better performance
            graphOptimizationLevel: 'all'
        };

        yolo_model = await ort.InferenceSession.create(modelUrl, options);

        document.getElementById('status').innerText = 'Ready';
        console.log("YOLOv8 ONNX model loaded successfully.");

    } catch (err) {
        document.getElementById('status').innerText = 'Failed to load model.';
        console.error("Error loading model:", err);
    }
}

function sendToBackend(current_participants, personCount) {

    // Fallback: Use current ISO timestamp if timeString is not provided
    const payloadTime = getFormattedTime();

    fetch('actions.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            Time: payloadTime,
            current_participants: current_participants,
            totalParticipants: personCount
        })
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.status === 'error') {
                console.error("PHP Error:", data.message);
            }
        })
        .catch(err => console.error("Backend sync failed:", err));
}

async function detectPeople() {
    if (!yolo_model) return;

    let tensor;
    let outputMap;
    let outputTensor;

    try {
        // 1. Preprocess image data and transpose from BHWC [1,640,640,3] to BCHW [1,3,640,640]
        tensor = tf.tidy(() => {
            const input = tf.browser.fromPixels(video);
            const resized = tf.image.resizeBilinear(input, [640, 640]).div(255.0);
            const batched = resized.expandDims(0);
            return batched.transpose([0, 3, 1, 2]);
        });

        // 2. Convert to an ONNX compatible Float32 WebGL/WASM data array
        const tensorData = await tensor.data();
        const inputOrtTensor = new ort.Tensor('float32', tensorData, [1, 3, 640, 640]);

        // 3. Execute inference using ONNX Runtime session execution
        const feeds = { images: inputOrtTensor };
        outputMap = await yolo_model.run(feeds);

        // 4. Extract output matrix data (Shape: [1, 5, 8400])
        const outputName = yolo_model.outputNames[0];
        const rawOutput = outputMap[outputName];

        // 5. Convert back into a TFJS tensor layout to feed your existing post-processing pipe
        outputTensor = tf.tensor(rawOutput.data, rawOutput.dims);

        // Clear display canvas for updated tracking frame overlays
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        drawCountingZone();

        const [formattedBoxes, scores] = tf.tidy(() => {
            const output = outputTensor.squeeze();
            const transposed = output.transpose([1, 0]);

            const cx = transposed.slice([0, 0], [-1, 1]).squeeze();
            const cy = transposed.slice([0, 1], [-1, 1]).squeeze();
            const w = transposed.slice([0, 2], [-1, 1]).squeeze();
            const h = transposed.slice([0, 3], [-1, 1]).squeeze();

            const x1 = cx.sub(w.div(2));
            const y1 = cy.sub(h.div(2));
            const x2 = cx.add(w.div(2));
            const y2 = cy.add(h.div(2));

            const boxes = tf.stack([y1, x1, y2, x2], 1);
            const classScores = transposed.slice([0, 4], [-1, 1]).squeeze();

            return [boxes, classScores];
        });

        const maxOutputSize = 300;
        const iouThreshold = 0.35;
        const scoreThreshold = 0.30;

        const nmsIndices = await tf.image.nonMaxSuppressionAsync(
            formattedBoxes,
            scores,
            maxOutputSize,
            iouThreshold,
            scoreThreshold
        );

        const filteredBoxesTensor = tf.gather(formattedBoxes, nmsIndices);
        const filteredScoresTensor = tf.gather(scores, nmsIndices);

        const rawBoxes = await filteredBoxesTensor.array();
        const rawScores = await filteredScoresTensor.array();

        formattedBoxes.dispose();
        scores.dispose();
        nmsIndices.dispose();
        filteredBoxesTensor.dispose();
        filteredScoresTensor.dispose();
        outputTensor.dispose();

        const currentDetections = [];
        const scaleX = canvas.width / 640;
        const scaleY = canvas.height / 640;

        for (let i = 0; i < rawBoxes.length; i++) {
            const [y1, x1, y2, x2] = rawBoxes[i];
            const score = rawScores[i];

            const x = x1 * scaleX;
            const y = y1 * scaleY;
            const width = (x2 - x1) * scaleX;
            const height = (y2 - y1) * scaleY;

            currentDetections.push({
                centerX: x + (width / 2),
                centerY: y + (height / 2),
                box: [x, y, width, height],
                score: score
            });
        }

        // Zone Center & Rotation Angle
        const zoneCenterX = countingZone.x + (countingZone.width / 2);
        const zoneCenterY = countingZone.y + (countingZone.height / 2);
        const angleRad = ((countingZone.angle || 0) * Math.PI) / 180;
        const cosA = Math.cos(-angleRad);
        const sinA = Math.sin(-angleRad);

        function isPointInRotatedRect(px, py) {
            const dx = px - zoneCenterX;
            const dy = py - zoneCenterY;

            const localX = zoneCenterX + (dx * cosA - dy * sinA);
            const localY = zoneCenterY + (dx * sinA + dy * cosA);

            return (
                localX >= countingZone.x &&
                localX <= countingZone.x + countingZone.width &&
                localY >= countingZone.y &&
                localY <= countingZone.y + countingZone.height
            );
        }

        let matchedDetections = new Set();
        let nextTrackedPersons = {};

        // Update existing tracks & Check presence in Green Zone
        Object.keys(trackedPersons).forEach(id => {
            const track = trackedPersons[id];
            let closestDist = maxDisplacement;
            let matchedIdx = -1;

            currentDetections.forEach((det, idx) => {
                if (matchedDetections.has(idx)) return;
                const dist = Math.hypot(det.centerX - track.centerX, det.centerY - track.centerY);
                if (dist < closestDist) {
                    closestDist = dist;
                    matchedIdx = idx;
                }
            });

            if (matchedIdx !== -1) {
                const det = currentDetections[matchedIdx];
                matchedDetections.add(matchedIdx);

                let insideZone = track.insideZone || false;
                if (!insideZone && isPointInRotatedRect(det.centerX, det.centerY)) {
                    personCount += 1;
                    insideZone = true;
                }

                nextTrackedPersons[id] = {
                    centerX: det.centerX,
                    centerY: det.centerY,
                    box: det.box,
                    score: det.score,
                    insideZone: insideZone,
                    missedFrames: 0
                };
            } else {
                const missedFrames = (track.missedFrames || 0) + 1;
                if (missedFrames <= maxTrackAge) {
                    nextTrackedPersons[id] = {
                        ...track,
                        missedFrames: missedFrames
                    };
                }
            }
        });

        // Register brand new tracks
        currentDetections.forEach((det, idx) => {
            if (matchedDetections.has(idx)) return;

            let insideZone = isPointInRotatedRect(det.centerX, det.centerY);
            if (insideZone) {
                personCount += 1;
                currentParticipants += 1;
                console.log(`New Person current:${currentParticipants} inside zone! Total Count: ${personCount}`);
            }

            nextTrackedPersons[nextPersonId++] = {
                centerX: det.centerX,
                centerY: det.centerY,
                box: det.box,
                score: det.score,
                insideZone: insideZone,
                missedFrames: 0
            };
        });

        // UI State sync
        document.getElementById('detections').innerText = `Zone Count: ${personCount}`;
        trackedPersons = nextTrackedPersons;

        // Render bounding boxes
        Object.keys(trackedPersons).forEach(id => {
            const person = trackedPersons[id];
            if (person.missedFrames > 0) return;

            const [x, y, width, height] = person.box;

            ctx.strokeStyle = person.insideZone ? '#00ff00' : '#ff0000';
            ctx.lineWidth = 3;
            ctx.strokeRect(x, y, width, height);

            ctx.fillStyle = ctx.strokeStyle;
            ctx.font = '24px Arial';
            ctx.fillText(`ID: ${id} (${Math.round(person.score * 100)}%)`, x, y > 20 ? y - 10 : 20);
        });

    } catch (err) {
        console.error("Inference dropped frame or execution failed:", err);
    } finally {
        if (tensor) tensor.dispose();
        if (outputTensor) outputTensor.dispose();
    }

    frameCount++;
    const now = Date.now();
    if (now - lastTime >= 1000) {
        document.getElementById('fps').innerText = frameCount;
        frameCount = 0;
        lastTime = now;
    }
}
async function predictionLoop() {
    if (!isProcessingActive) return;

    //await fetch_data_sql();
    await detectPeople();
    setTimeout(predictionLoop, 100);
}

function Start() {
    startButton.addEventListener('click', () => {
        if (!isProcessingActive) {
            isProcessingActive = true;

            predictionLoop();
        }
        video.play()
            .then(() => {
                console.log("Video playback started successfully.");
            })
            .catch((error) => {
                console.error("Error attempting to play video:", error);
            });
    });
}

/*async function fetch_data_sql() {
    try {
        const response = await fetch('get_element.php');
        const data = await response.json();
        peopleCount = data.peopleCount;
        document.getElementById('detections').innerText = data.currentParticipants;
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}*/

async function run() {
    try {
        await setupCamera();
        await loadModel();
        await checkSession();
        await setupZoneControls();
        drawCountingZone();
        await Start();

        if (isProcessingActive) {
            predictionLoop();
        }

    } catch (error) {
        if (error.name === 'NotReadableError') {
            document.getElementById('status').innerText = 'Camera blocked by another app/tab.';
        } else if (error.name === 'NotAllowedError') {
            document.getElementById('status').innerText = 'Initialization error.';
        } else {
            document.getElementById('status').innerText = 'Error: ' + error.message;
        }
    }
}
run();