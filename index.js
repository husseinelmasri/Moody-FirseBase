/* === Imports === */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

/* === Firebase Setup === */
const firebaseConfig = {
  apiKey: 'AIzaSyC2fPbp9ylPOV6wK9Sz6gQm_WxClxVK3WI',
  authDomain: 'moody-c22bb.firebaseapp.com',
  projectId: 'moody-c22bb',
  storageBucket: 'moody-c22bb.firebasestorage.app',
  messagingSenderId: '96335990404',
  appId: '1:96335990404:web:cf1dc878e83802ed007cd1',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

/* === UI Elements === */
const viewLoggedOut = document.getElementById('logged-out-view');
const viewLoggedIn = document.getElementById('logged-in-view');

const signInWithGoogleButtonEl = document.getElementById(
  'sign-in-with-google-btn'
);
const emailInputEl = document.getElementById('email-input');
const passwordInputEl = document.getElementById('password-input');
const signInButtonEl = document.getElementById('sign-in-btn');
const createAccountButtonEl = document.getElementById('create-account-btn');
const signOutButtonEl = document.getElementById('sign-out-btn');
const userProfilePictureEl = document.getElementById('user-profile-picture');
const userGreetingEl = document.getElementById('user-greeting');
const displayNameInputEl = document.getElementById('display-name-input');
const photoURLInputEl = document.getElementById('photo-url-input');
const updateProfileButtonEl = document.getElementById('update-profile-btn');

/* === Event Listeners (safe) === */
signInWithGoogleButtonEl?.addEventListener('click', authSignInWithGoogle);
signInButtonEl?.addEventListener('click', authSignInWithEmail);
createAccountButtonEl?.addEventListener('click', authCreateAccountWithEmail);
signOutButtonEl?.addEventListener('click', authSignOut);
updateProfileButtonEl?.addEventListener('click', authUpdateProfile);

/* === Auth State === */
onAuthStateChanged(auth, (user) => {
  if (user) {
    showLoggedInView();
    showProfilePicture(userProfilePictureEl, user);
    showUserGreeting(userGreetingEl, user);
  } else {
    showLoggedOutView();
  }
});

/* === Auth Functions === */
function authSignInWithGoogle() {
  signInWithPopup(auth, provider)
    .then(() => {
      console.log('Successfully signed in with Google');
    })
    .catch((error) => {
      console.error(error.message);
    });
}

function authSignInWithEmail() {
  const email = emailInputEl.value;
  const password = passwordInputEl.value;

  signInWithEmailAndPassword(auth, email, password)
    .then(() => {
      clearAuthInputFields();
    })
    .catch((error) => {
      console.error(error.message);
    });
}

function authCreateAccountWithEmail() {
  const email = emailInputEl.value;
  const password = passwordInputEl.value;

  createUserWithEmailAndPassword(auth, email, password)
    .then(() => {
      clearAuthInputFields();
    })
    .catch((error) => {
      console.error(error.message);
    });
}

function authUpdateProfile() {
  const newphotoURL = photoURLInputEl.value;
  const newDisplayName = displayNameInputEl.value;

  updateProfile(auth.currentUser, {
    displayName: newDisplayName,
    photoURL: newphotoURL,
  })
    .then(() => {
      console.log('Profile updated successfully');
    })
    .catch((error) => {
      console.error(error.message);
    });
}

function authSignOut() {
  signOut(auth).catch((error) => {
    console.error(error.message);
  });
}

/* === UI Helper Functions === */
function showLoggedOutView() {
  hideView(viewLoggedIn);
  showView(viewLoggedOut);
}

function showLoggedInView() {
  hideView(viewLoggedOut);
  showView(viewLoggedIn);
}

function showView(view) {
  if (view) view.style.display = 'flex';
}

function hideView(view) {
  if (view) view.style.display = 'none';
}

function clearInputField(inputField) {
  if (inputField) inputField.value = '';
}

function clearAuthInputFields() {
  clearInputField(emailInputEl);
  clearInputField(passwordInputEl);
}

function showProfilePicture(imgElement, user) {
  if (!imgElement) return;
  imgElement.src =
    user.photoURL || 'assets/images/default-profile-picture.jpeg';
}

function showUserGreeting(element, user) {
  if (!element) return;

  if (user.displayName) {
    const firstName = user.displayName.split(' ')[0];
    element.textContent = `Hello, ${firstName}! How are you today?`;
  } else {
    element.textContent = 'Hello! How are you today?';
  }
}
