'use strict';
//Odl format
//const fs = require('fq3s');
//const bencode = require('bencode');

import fs from 'fs';
import bencode from 'bencode';

const torrent = bencode.decode(fs.readFileSync('puppy.torrent'));
console.log(torrent.announce.toString('utf8'));  //make sure the buffers are encoded correctly in utf8

//const torrent = fs.readFileSync('puppy.torrent');
//console.log(torrent.toString('utf8'));  //make sure the buffers are encoded correctly in utf8


