import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { addDoc, collection, doc, getDoc, getFirestore, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Firebase configuration - replace with your config
const firebaseConfig = {
	apiKey: "AIzaSyBgu6wGpsomoC9r44QC0aBWqUFjwk8yRZI",
	authDomain: "jlio-de9c4.firebaseapp.com",
	projectId: "jlio-de9c4",
	storageBucket: "jlio-de9c4.firebasestorage.app",
	messagingSenderId: "620411268963",
	appId: "1:620411268963:web:7038fb998374ea5c3f6d56"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);


// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
let username = 'Someone';
let userId = urlParams.get('uid') || window.location.pathname.split('/ask/')[1];
const customQuestionId = urlParams.get('qid') || urlParams.get('customQuestionId');
const customQuestionText = urlParams.get('qt') || urlParams.get('customQuestionText');

// Profile UI elements
const profileHeader = document.getElementById('profileHeader');
const userAvatar = document.getElementById('userAvatar');
const profileUsername = document.getElementById('profileUsername');
const profileLoading = document.getElementById('profileLoading');

async function fetchAndDisplayProfile() {
	if (!userId) {
		profileUsername.textContent = '@unknown';
		userAvatar.src = '/assets/images/logo.png';
		return;
	}
	profileLoading.style.display = 'block';
	try {
		const userRef = doc(db, 'users', userId);
		const userSnap = await getDoc(userRef);
		if (userSnap.exists()) {
			const data = userSnap.data();
			username = data.username || 'Someone';
			profileUsername.textContent = `@${username}`;
			if (data.avatar) {
				userAvatar.src = data.avatar;
			} else {
				userAvatar.src = '/assets/images/logo.png';
			}
			// Show/hide accepting questions
			if (data.isAcceptingQuestions === false) {
				document.getElementById('questionForm').style.display = 'none';
				document.getElementById('errorMessage').style.display = 'block';
				document.getElementById('errorMessage').textContent = '❌ This user is not accepting questions.';
			}
		} else {
			profileUsername.textContent = '@unknown';
			userAvatar.src = '/assets/images/logo.png';
			document.getElementById('questionForm').style.display = 'none';
			document.getElementById('errorMessage').style.display = 'block';
			document.getElementById('errorMessage').textContent = '❌ User not found.';
		}
	} catch (e) {
		profileUsername.textContent = '@unknown';
		userAvatar.src = '/assets/images/logo.png';
		document.getElementById('questionForm').style.display = 'none';
		document.getElementById('errorMessage').style.display = 'block';
		document.getElementById('errorMessage').textContent = '❌ Error loading user profile.';
	} finally {
		profileLoading.style.display = 'none';
	}
}

fetchAndDisplayProfile();

// Pre-fill custom question if provided
if (customQuestionText) {
	document.getElementById('questionText').value = customQuestionText;
	updateCharCounter();
}

// Character counter
const questionInput = document.getElementById('questionText');
const charCounter = document.getElementById('charCounter');

function updateCharCounter() {
	const length = questionInput.value.length;
	charCounter.textContent = `${length}/500`;
    
	if (length > 450) {
		charCounter.classList.add('error');
		charCounter.classList.remove('warning');
	} else if (length > 400) {
		charCounter.classList.add('warning');
		charCounter.classList.remove('error');
	} else {
		charCounter.classList.remove('warning', 'error');
	}
}

questionInput.addEventListener('input', updateCharCounter);


// Form submission
document.getElementById('questionForm').addEventListener('submit', async (e) => {
	e.preventDefault();
	const questionText = questionInput.value.trim();
	if (!questionText) return;

	// Show loading state
	document.getElementById('loading')?.style && (document.getElementById('loading').style.display = 'block');
	document.getElementById('questionForm').style.display = 'none';
	document.getElementById('errorMessage').style.display = 'none';

	try {
		// Fetch recipient profile again to ensure up-to-date info
		const userRef = doc(db, 'users', userId);
		const userSnap = await getDoc(userRef);
		if (!userSnap.exists() || userSnap.data().isAcceptingQuestions === false) {
			throw new Error('Recipient not accepting questions');
		}

		// Submit question to Firestore (sync with app logic)
		await addDoc(collection(db, 'questions'), {
			text: questionText,
			recipientId: userId,
			recipientUsername: username,
			isAnonymous: true,
			senderId: null,
			senderUsername: null,
			isCustom: !!customQuestionText,
			customQuestionId: customQuestionId || null,
			createdAt: serverTimestamp(),
			updatedAt: serverTimestamp(),
			status: 'pending',
			source: 'web',
			metadata: {
				userAgent: navigator.userAgent,
				ipAddress: null // Not available from browser
			},
			views: 0,
			reportCount: 0,
			isReported: false
		});

		// Show success message
		document.getElementById('loading')?.style && (document.getElementById('loading').style.display = 'none');
		document.getElementById('successMessage').style.display = 'block';
		// Reset form
		questionInput.value = '';
		updateCharCounter();
	} catch (error) {
		console.error('Error submitting question:', error);
		document.getElementById('loading')?.style && (document.getElementById('loading').style.display = 'none');
		document.getElementById('questionForm').style.display = 'block';
		document.getElementById('errorMessage').style.display = 'block';
		document.getElementById('errorMessage').textContent = '❌ Unable to send question. This user may not be accepting questions.';
	}
});

// Handle missing user ID
if (!userId) {
	document.getElementById('questionForm').style.display = 'none';
	document.getElementById('errorMessage').style.display = 'block';
	document.getElementById('errorMessage').textContent = '❌ Invalid link. Please make sure you have the correct URL.';
}
