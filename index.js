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
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  setDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

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

/* === Golobal Constants === */
const collectionName = 'posts';

/* == UI - Elements == */
const viewLoggedOut = document.getElementById('logged-out-view');
const viewLoggedIn = document.getElementById('logged-in-view');
const signInWithGoogleButtonEl = document.getElementById(
  'sign-in-with-google-btn',
);
const emailInputEl = document.getElementById('email-input');
const passwordInputEl = document.getElementById('password-input');
const signInButtonEl = document.getElementById('sign-in-btn');
const createAccountButtonEl = document.getElementById('create-account-btn');
const signOutButtonEl = document.getElementById('sign-out-btn');
const userProfilePictureEl = document.getElementById('user-profile-picture');
const userGreetingEl = document.getElementById('user-greeting');
const moodEmojiEls = document.getElementsByClassName('mood-emoji-btn');
const textareaEl = document.getElementById('post-input');
const postButtonEl = document.getElementById('post-btn');
const postsEl = document.getElementById('posts');

/* == UI - Event Listeners == */
if (signInWithGoogleButtonEl) {
  signInWithGoogleButtonEl.addEventListener('click', authSignInWithGoogle);
}

if (signInButtonEl) {
  signInButtonEl.addEventListener('click', authSignInWithEmail);
}

if (createAccountButtonEl) {
  createAccountButtonEl.addEventListener('click', authCreateAccountWithEmail);
}

if (signOutButtonEl) {
  signOutButtonEl.addEventListener('click', authSignOut);
}

if (moodEmojiEls) {
  for (let moodEmojiEl of moodEmojiEls) {
    moodEmojiEl.addEventListener('click', selectMood);
  }
}

if (postButtonEl) {
  postButtonEl.addEventListener('click', postButtonPressed);
}

/* === State === */
let moodState = 0;

/* === Main Code === */
onAuthStateChanged(auth, (user) => {
  if (user) {
    showLoggedInView();
    showProfilePicture(userProfilePictureEl, user);
    showUserGreeting(userGreetingEl, user);
    fetchInRealtimeAndRenderPostsFromDB();
  } else {
    showLoggedOutView();
  }
});

/* === Functions === */

/* = Functions - Firebase - Authentication = */
function authSignInWithGoogle() {
  signInWithPopup(auth, provider)
    .then((result) => {
      console.log('Signed in with Google');
    })
    .catch((error) => {
      console.error(error.message);
    });
}

function authSignInWithEmail() {
  const email = emailInputEl.value;
  const password = passwordInputEl.value;

  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      clearAuthFields();
    })
    .catch((error) => {
      console.error(error.message);
    });
}

function authCreateAccountWithEmail() {
  const email = emailInputEl.value;
  const password = passwordInputEl.value;

  createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      clearAuthFields();
    })
    .catch((error) => {
      console.error(error.message);
    });
}

function authSignOut() {
  signOut(auth)
    .then(() => {})
    .catch((error) => {
      console.error(error.message);
    });
}

/* = Functions - Firebase - Cloud Firestore = */
async function addPostToDB(postBody, user) {
  try {
    const docRef = await addDoc(collection(db, collectionName), {
      // ← Fixed: use variable, not string literal
      body: postBody,
      uid: user.uid,
      createdAt: serverTimestamp(),
      mood: moodState,
    });
    console.log('Document written with ID: ', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error adding post:', error);
    throw error;
  }
}

function fetchInRealtimeAndRenderPostsFromDB() {
  onSnapshot(collection(db, collectionName), (querySnapshot) => {
    clearAll(postsEl);

    querySnapshot.forEach((doc) => {
      renderPost(postsEl, doc.data());
    });
  });
}

/* == Functions - UI Functions == */
function renderPost(postsEl, postData, postId) {
  try {
    // Check if createdAt exists and is a valid Firestore timestamp
    let dateString = 'Date not available';

    if (postData.createdAt) {
      try {
        // Convert Firestore timestamp to Date object
        const date = postData.createdAt.toDate();
        dateString = displayDate(date);
      } catch (dateError) {
        console.warn('Error parsing date:', dateError);
        dateString = 'Recent';
      }
    }

    // Check if mood exists, default to 0 (neutral) if not
    const mood = postData.mood || 0;

    // Create the post HTML
    const postHtml = `
      <div class="post" id="post-${postId}">
        <div class="header">
          <h3>${dateString}</h3>
          <img src="assets/emojis/${mood}.png" alt="Mood ${mood}" width="30" height="30">
        </div>
        <p>${replaceNewLinesWithBrTags(postData.body) || 'No content'}</p>
      </div>
    `;

    postsEl.innerHTML += postHtml;
  } catch (renderError) {
    console.error('Error rendering post:', renderError);
  }
}

function replaceNewLinesWithBrTags(inputStrings) {
  return inputStrings.replace(/\n/g, '<br>');
}
function postButtonPressed() {
  const postBody = textareaEl.value;
  const user = auth.currentUser;

  if (!user) {
    alert('Please sign in to post');
    return;
  }

  if (!postBody || postBody.trim() === '') {
    alert('Please write something before posting');
    return;
  }

  if (!moodState) {
    alert('Please select a mood before posting');
    return;
  }

  // Disable button during posting
  const originalText = postButtonEl.textContent;
  postButtonEl.disabled = true;
  postButtonEl.textContent = 'Posting...';

  addPostToDB(postBody.trim(), user)
    .then((postId) => {
      console.log('Post added successfully:', postId);
      clearInputField(textareaEl);
      resetAllMoodElements(moodEmojiEls);
      moodState = 0;

      // Optional: Auto-fetch posts after posting
      // fetchOnceAndRenderPostsFromDB();
    })
    .catch((error) => {
      console.error('Failed to post:', error);
      alert('Failed to post: ' + error.message);
    })
    .finally(() => {
      // Re-enable button
      postButtonEl.disabled = false;
      postButtonEl.textContent = originalText;
    });
}

function clearAll(element) {
  if (element) {
    element.innerHTML = '';
  }
}

function showLoggedOutView() {
  hideView(viewLoggedIn);
  showView(viewLoggedOut);
}

function showLoggedInView() {
  hideView(viewLoggedOut);
  showView(viewLoggedIn);
}

function showView(view) {
  if (view) {
    view.style.display = 'flex';
  }
}

function hideView(view) {
  if (view) {
    view.style.display = 'none';
  }
}

function clearInputField(field) {
  if (field) {
    field.value = '';
  }
}

function clearAuthFields() {
  clearInputField(emailInputEl);
  clearInputField(passwordInputEl);
}

function showProfilePicture(imgElement, user) {
  if (!imgElement) return;

  const photoURL = user.photoURL;

  if (photoURL) {
    imgElement.src = photoURL;
  } else {
    imgElement.src = 'assets/images/default-profile-picture.jpeg';
  }
}

function showUserGreeting(element, user) {
  if (!element) return;

  const displayName = user.displayName;

  if (displayName) {
    const userFirstName = displayName.split(' ')[0];
    element.textContent = `Hey ${userFirstName}, how are you?`;
  } else {
    element.textContent = `Hey friend, how are you?`;
  }
}

function displayDate(date) {
  try {
    const day = date.getDate();
    const year = date.getFullYear();

    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    const month = monthNames[date.getMonth()];

    let hours = date.getHours();
    let minutes = date.getMinutes();
    hours = hours < 10 ? '0' + hours : hours;
    minutes = minutes < 10 ? '0' + minutes : minutes;

    return `${day} ${month} ${year} - ${hours}:${minutes}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Date unknown';
  }
}

/* = Functions - UI Functions - Mood = */
function selectMood(event) {
  const selectedMoodEmojiElementId = event.currentTarget.id;

  changeMoodsStyleAfterSelection(selectedMoodEmojiElementId, moodEmojiEls);

  const chosenMoodValue = returnMoodValueFromElementId(
    selectedMoodEmojiElementId,
  );

  moodState = chosenMoodValue;
}

function changeMoodsStyleAfterSelection(
  selectedMoodElementId,
  allMoodElements,
) {
  for (let moodEmojiEl of moodEmojiEls) {
    if (selectedMoodElementId === moodEmojiEl.id) {
      moodEmojiEl.classList.remove('unselected-emoji');
      moodEmojiEl.classList.add('selected-emoji');
    } else {
      moodEmojiEl.classList.remove('selected-emoji');
      moodEmojiEl.classList.add('unselected-emoji');
    }
  }
}

function resetAllMoodElements(allMoodElements) {
  for (let moodEmojiEl of allMoodElements) {
    moodEmojiEl.classList.remove('selected-emoji');
    moodEmojiEl.classList.remove('unselected-emoji');
  }

  moodState = 0;
}

function returnMoodValueFromElementId(elementId) {
  return Number(elementId.slice(5));
}
