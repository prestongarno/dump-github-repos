#!/usr/bin/env node
const options = {};

function failProgram(message) {
    console.error(message);
    process.exit(1);
}

const USAGE = "Usage: dump-github-repos --AUTH_TOKEN=[Github authorization token here] --out=[path to directory here]";

function parse(value) {
    if (!(typeof value === 'string'))
        return null;
    values = value.split('=');
    if (values.length !== 2)
        return null;
    let result = {
        key: values[0].trim().replace(/^--/, ''),
        value: values[1].trim()
    };
    if (result.key.length === 0 || result.value.length === 0)
        return null;
    return result;
}

process.argv
    .map(it => parse('' + it))
    .filter(it => it)
    .forEach(it => options[it.key] = it.value);

const headers = {
    "User-Agent": "iMacAppStore/1.0.1 (Macintosh; U; Intel Mac OS X 10.6.7; en) AppleWebKit/533.20.25"
};

if (!options.out) {
    failProgram(USAGE);
}
if (options.AUTH_TOKEN) {
    headers.Authorization = 'Bearer ' + (options.AUTH_TOKEN || '');
} else {
    failProgram(USAGE)
}

let query = `
query {
    viewer {
        login
        repositories(first: 1, isFork: false) {
            nodes{
              name,
              url
            }
        }
    }
}`;

let request = require('request');

let requestOptions = {
    url: 'https://api.github.com/graphql',
    headers: headers,
    json: {
        query: query
    }
};

let fs = require('fs');

function cloneAllRepos(arrayOfRepos) {
    arrayOfRepos.forEach(repo => {
        console.log(`Attempting to clone '${repo.name}' (${repo.url})`);
        const outdir = require('path').normalize(options.out + '/' + repo.name);
        if (!fs.existsSync(outdir)){
            fs.mkdirSync(outdir);
            let cp = require("child_process");
            cp.exec("git clone " + repo.url + " " + outdir || '', () => console.log('done.'));
        } else {
            console.log("Directory already exists. Skipping...")
        }
    })
}

request.post(requestOptions, function (error, response, body) {
        if (error) failProgram(error.message);
        if (!error && response.statusCode === 200) {
            cloneAllRepos(body.data.viewer.repositories.nodes);
        } else {
            failProgram("Got HTTP Error code " + response.statusCode)
        }
    }
);

