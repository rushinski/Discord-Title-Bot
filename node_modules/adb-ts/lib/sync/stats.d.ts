/// <reference types="node" />
import fs from 'fs';
export default class Stats extends fs.Stats {
    readonly mode: number;
    readonly size: number;
    readonly mtime: Date;
    static readonly S_IFMT = 61440;
    static readonly S_IFSOCK = 49152;
    static readonly S_IFLNK = 40960;
    static readonly S_IFREG = 32768;
    static readonly S_IFBLK = 24576;
    static readonly S_IFDIR = 16384;
    static readonly S_IFCHR = 8192;
    static readonly S_IFIFO = 4096;
    static readonly S_ISUID = 2048;
    static readonly S_ISGID = 1024;
    static readonly S_ISVTX = 512;
    static readonly S_IRWXU = 448;
    static readonly S_IRUSR = 256;
    static readonly S_IWUSR = 128;
    static readonly S_IXUSR = 64;
    static readonly S_IRWXG = 56;
    static readonly S_IRGRP = 32;
    constructor(mode: number, size: number, mtime: number);
}
