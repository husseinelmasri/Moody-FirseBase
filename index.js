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
  updateDoc,
  deleteDoc, // Added missing import for delete
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  where,
  Timestamp,
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

/* === UI === */

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

const allFilterButtonEl = document.getElementById('all-filter-btn');

const filterButtonEls = document.getElementsByClassName('filter-btn');

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

if (filterButtonEls) {
  for (let filterButtonEl of filterButtonEls) {
    filterButtonEl.addEventListener('click', selectFilter);
  }
}

if (postButtonEl) {
  postButtonEl.addEventListener('click', postButtonPressed);
}

/* === State === */

let moodState = 0;

/* === Global Constants === */

const collectionName = 'posts';

/* === Main Code === */

onAuthStateChanged(auth, (user) => {
  if (user) {
    showLoggedInView();
    showProfilePicture(userProfilePictureEl, user);
    showUserGreeting(userGreetingEl, user);
    updateFilterButtonStyle(allFilterButtonEl);
    fetchAllPosts(user);
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
      alert('Failed to sign in with Google: ' + error.message);
    });
}

function authSignInWithEmail() {
  const email = emailInputEl.value;
  const password = passwordInputEl.value;

  if (!email || !password) {
    alert('Please enter both email and password');
    return;
  }

  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      clearAuthFields();
    })
    .catch((error) => {
      console.error(error.message);
      alert('Failed to sign in: ' + error.message);
    });
}

function authCreateAccountWithEmail() {
  const email = emailInputEl.value;
  const password = passwordInputEl.value;

  if (!email || !password) {
    alert('Please enter both email and password');
    return;
  }

  createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      clearAuthFields();
    })
    .catch((error) => {
      console.error(error.message);
      alert('Failed to create account: ' + error.message);
    });
}

function authSignOut() {
  signOut(auth)
    .then(() => {
      console.log('Signed out');
    })
    .catch((error) => {
      console.error(error.message);
      alert('Failed to sign out: ' + error.message);
    });
}

/* = Functions - Firebase - Cloud Firestore = */

async function addPostToDB(postBody, user) {
  try {
    const docRef = await addDoc(collection(db, collectionName), {
      body: postBody,
      uid: user.uid,
      createdAt: serverTimestamp(),
      mood: moodState,
    });
    console.log('Document written with ID: ', docRef.id);

    // Clear form after successful post
    clearInputField(textareaEl);
    resetAllMoodElements(moodEmojiEls);
    moodState = 0;

    return docRef.id;
  } catch (error) {
    console.error('Error adding post:', error);
    alert('Failed to post: ' + error.message);
    throw error;
  }
}

async function updatePostInDB(docId, newBody) {
  try {
    const postRef = doc(db, collectionName, docId);
    await updateDoc(postRef, {
      body: newBody,
    });
    console.log('Document updated with ID: ', docId);
  } catch (error) {
    console.error('Error updating document:', error);
    alert('Failed to update: ' + error.message);
  }
}

async function deletePostFromDB(docId) {
  try {
    await deleteDoc(doc(db, collectionName, docId));
    console.log('Document deleted with ID: ', docId);
  } catch (error) {
    console.error('Error deleting document:', error);
    alert('Failed to delete: ' + error.message);
  }
}

function fetchInRealtimeAndRenderPostsFromDB(query) {
  onSnapshot(
    query,
    (querySnapshot) => {
      clearAll(postsEl);

      querySnapshot.forEach((doc) => {
        renderPost(postsEl, doc);
      });
    },
    (error) => {
      console.error('Error fetching posts:', error);
    },
  );
}

function fetchTodayPosts(user) {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999,
  );

  const postsRef = collection(db, collectionName);

  const q = query(
    postsRef,
    where('uid', '==', user.uid),
    where('createdAt', '>=', Timestamp.fromDate(startOfDay)),
    where('createdAt', '<=', Timestamp.fromDate(endOfDay)),
    orderBy('createdAt', 'desc'),
  );

  fetchInRealtimeAndRenderPostsFromDB(q);
}

function fetchWeekPosts(user) {
  const now = new Date();
  const startOfWeek = new Date(now);

  // Get Monday of current week
  const day = startOfWeek.getDay();
  const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
  startOfWeek.setDate(diff);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const postsRef = collection(db, collectionName);

  const q = query(
    postsRef,
    where('uid', '==', user.uid),
    where('createdAt', '>=', Timestamp.fromDate(startOfWeek)),
    where('createdAt', '<=', Timestamp.fromDate(endOfDay)),
    orderBy('createdAt', 'desc'),
  );

  fetchInRealtimeAndRenderPostsFromDB(q);
}

function fetchMonthPosts(user) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  startOfMonth.setHours(0, 0, 0, 0);

  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const postsRef = collection(db, collectionName);

  const q = query(
    postsRef,
    where('uid', '==', user.uid),
    where('createdAt', '>=', Timestamp.fromDate(startOfMonth)),
    where('createdAt', '<=', Timestamp.fromDate(endOfDay)),
    orderBy('createdAt', 'desc'),
  );

  fetchInRealtimeAndRenderPostsFromDB(q);
}

function fetchAllPosts(user) {
  const postsRef = collection(db, collectionName);

  const q = query(
    postsRef,
    where('uid', '==', user.uid),
    orderBy('createdAt', 'desc'),
  );

  fetchInRealtimeAndRenderPostsFromDB(q);
}

/* == Functions - UI Functions == */

function createPostHeader(postData) {
  const headerDiv = document.createElement('div');
  headerDiv.className = 'header';

  const headerDate = document.createElement('h3');
  headerDate.textContent = displayDate(postData.createdAt);
  headerDiv.appendChild(headerDate);

  const moodImage = document.createElement('img');
  moodImage.src = `assets/emojis/${postData.mood || 0}.png`;
  moodImage.alt = `Mood ${postData.mood || 0}`;
  moodImage.width = 30;
  moodImage.height = 30;
  headerDiv.appendChild(moodImage);

  return headerDiv;
}

function createPostBody(postData) {
  const postBody = document.createElement('p');
  postBody.innerHTML = replaceNewlinesWithBrTags(postData.body || 'No content');

  return postBody;
}

function createPostUpdateButton(wholeDoc) {
  const postId = wholeDoc.id;
  const postData = wholeDoc.data();

  const button = document.createElement('button');
  button.textContent = 'Edit';
  button.classList.add('edit-color');
  button.addEventListener('click', function () {
    const newBody = prompt('Edit the post', postData.body);

    if (newBody && newBody.trim() !== '') {
      updatePostInDB(postId, newBody.trim());
    }
  });

  return button;
}

function createPostDeleteButton(wholeDoc) {
  const postId = wholeDoc.id;

  const button = document.createElement('button');
  button.textContent = 'Delete';
  button.classList.add('delete-color');
  button.addEventListener('click', function () {
    if (confirm('Are you sure you want to delete this post?')) {
      deletePostFromDB(postId);
    }
  });
  return button;
}

function createPostFooter(wholeDoc) {
  const footerDiv = document.createElement('div');
  footerDiv.className = 'footer';

  footerDiv.appendChild(createPostUpdateButton(wholeDoc));
  footerDiv.appendChild(createPostDeleteButton(wholeDoc));

  return footerDiv;
}

function renderPost(postsEl, wholeDoc) {
  const postData = wholeDoc.data();

  const postDiv = document.createElement('div');
  postDiv.className = 'post';
  postDiv.id = `post-${wholeDoc.id}`;

  postDiv.appendChild(createPostHeader(postData));
  postDiv.appendChild(createPostBody(postData));
  postDiv.appendChild(createPostFooter(wholeDoc));

  postsEl.appendChild(postDiv);
}

function replaceNewlinesWithBrTags(inputString) {
  if (!inputString) return '';
  return inputString.replace(/\n/g, '<br>');
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

  addPostToDB(postBody.trim(), user);
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

function displayDate(firebaseDate) {
  if (!firebaseDate) {
    return 'Date processing';
  }

  try {
    const date = firebaseDate.toDate();

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

/* == Functions - UI Functions - Date Filters == */

function resetAllFilterButtons(allFilterButtons) {
  for (let filterButtonEl of allFilterButtons) {
    filterButtonEl.classList.remove('selected-filter');
  }
}

function updateFilterButtonStyle(element) {
  if (element) {
    element.classList.add('selected-filter');
  }
}

function fetchPostsFromPeriod(period, user) {
  if (!user) return;

  if (period === 'today') {
    fetchTodayPosts(user);
  } else if (period === 'week') {
    fetchWeekPosts(user);
  } else if (period === 'month') {
    fetchMonthPosts(user);
  } else {
    fetchAllPosts(user);
  }
}

function selectFilter(event) {
  const user = auth.currentUser;
  if (!user) return;

  const selectedFilterElementId = event.target.id;
  const selectedFilterPeriod = selectedFilterElementId.split('-')[0];
  const selectedFilterElement = document.getElementById(
    selectedFilterElementId,
  );

  resetAllFilterButtons(filterButtonEls);
  updateFilterButtonStyle(selectedFilterElement);
  fetchPostsFromPeriod(selectedFilterPeriod, user);
}
