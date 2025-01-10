const CLIENT_ID = '958416089916-mvdn670p5ugntc3i8b3mjad1rmmbao94.apps.googleusercontent.com';
const API_KEY = 'YOUR_API_KEY';
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

let tokenClient;
let gapiInited = false;
let gisInited = false;
let authorizedEmails = []; // Store authorized emails

function gapiLoaded() {
    gapi.load('client', initializeGapiClient);
}

async function initializeGapiClient() {
    await gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: DISCOVERY_DOCS,
    });
    gapiInited = true;
    maybeEnableButtons();
}

function gisLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '',
    });
    gisInited = true;
    maybeEnableButtons();
}

function maybeEnableButtons() {
    if (gapiInited && gisInited) {
        document.getElementById('authorize_button').classList.remove('hidden');
    }
}

function handleAuthClick() {
    tokenClient.callback = async (resp) => {
        if (resp.error) {
            throw resp;
        }
        const userInfo = await getUserInfo();
        const userEmail = userInfo.email;

        if (authorizedEmails.length === 0) {
            // Manager login
            document.getElementById('manager_panel').classList.remove('hidden');
        } else if (authorizedEmails.includes(userEmail)) {
            // Agent login
            document.getElementById('download_section').classList.remove('hidden');
            listFiles();
        } else {
            alert('You are not authorized to access this system.');
            handleSignoutClick();
        }

        document.getElementById('authorize_button').classList.add('hidden');
        document.getElementById('signout_button').classList.remove('hidden');
    };

    if (gapi.client.getToken() === null) {
        tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
        tokenClient.requestAccessToken({ prompt: '' });
    }
}

function handleSignoutClick() {
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token);
        gapi.client.setToken('');
    }
    document.getElementById('authorize_button').classList.remove('hidden');
    document.getElementById('signout_button').classList.add('hidden');
    document.getElementById('manager_panel').classList.add('hidden');
    document.getElementById('download_section').classList.add('hidden');
}

async function getUserInfo() {
    const response = await gapi.client.request({
        path: 'https://www.googleapis.com/oauth2/v3/userinfo',
    });
    return response.result;
}

// Manager actions
document.getElementById('add_agent').addEventListener('click', () => {
    const name = document.getElementById('agent_name').value;
    const email = document.getElementById('agent_email').value;

    if (name && email) {
        authorizedEmails.push(email);

        const listItem = document.createElement('li');
        listItem.textContent = `${name} (${email})`;
        const removeButton = document.createElement('button');
        removeButton.textContent = 'Remove';
        removeButton.onclick = () => {
            const index = authorizedEmails.indexOf(email);
            if (index !== -1) {
                authorizedEmails.splice(index, 1);
                listItem.remove();
            }
        };

        listItem.appendChild(removeButton);
        document.getElementById('agent_list').appendChild(listItem);

        document.getElementById('agent_name').value = '';
        document.getElementById('agent_email').value = '';
    } else {
        alert('Please enter both name and email.');
    }
});

// Drive actions
async function listFiles() {
    const response = await gapi.client.drive.files.list({
        pageSize: 10,
        fields: 'files(id, name)',
    });
    const files = response.result.files;
    const downloadList = document.getElementById('download_list');
    downloadList.innerHTML = '';

    if (!files || files.length === 0) {
        downloadList.innerHTML = '<li>No files found.</li>';
        return;
    }

    files.forEach(file => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `${file.name} <a href="https://drive.google.com/uc?id=${file.id}" target="_blank">Download</a>`;
        downloadList.appendChild(listItem);
    });
}
