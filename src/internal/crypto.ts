import * as Internal from '.'
import { KeyPairType } from '../types'
import msrcrypto from 'msrcrypto'

const webcrypto = window?.crypto || msrcrypto

export class Crypto {
    private _curve: Internal.AsyncCurve

    constructor() {
        this._curve = new Internal.AsyncCurve()
    }

    getRandomBytes(n: number): ArrayBuffer {
        const array = new Uint8Array(n)
        webcrypto.getRandomValues(array)
        return array.buffer
    }

    async encrypt(key: ArrayBuffer, data: ArrayBuffer, iv: ArrayBuffer): Promise<ArrayBuffer> {
        const impkey = await webcrypto.subtle.importKey('raw', key, { name: 'AES-CBC' }, false, ['encrypt'])

        return webcrypto.subtle.encrypt({ name: 'AES-CBC', iv: new Uint8Array(iv) }, impkey, data)
    }

    async decrypt(key: ArrayBuffer, data: ArrayBuffer, iv: ArrayBuffer): Promise<ArrayBuffer> {
        const impkey = await webcrypto.subtle.importKey('raw', key, { name: 'AES-CBC' }, false, ['decrypt'])

        return webcrypto.subtle.decrypt({ name: 'AES-CBC', iv: new Uint8Array(iv) }, impkey, data)
    }
    async sign(key: ArrayBuffer, data: ArrayBuffer): Promise<ArrayBuffer> {
        const impkey = await webcrypto.subtle.importKey(
            'raw',
            key,
            { name: 'HMAC', hash: { name: 'SHA-256' } },
            false,
            ['sign']
        )

        return webcrypto.subtle.sign({ name: 'HMAC', hash: 'SHA-256' }, impkey, data)
    }
    async hash(data: ArrayBuffer): Promise<ArrayBuffer> {
        return webcrypto.subtle.digest({ name: 'SHA-512' }, data)
    }

    async HKDF(input: ArrayBuffer, salt: ArrayBuffer, info: ArrayBuffer): Promise<ArrayBuffer[]> {
        // Specific implementation of RFC 5869 that only returns the first 3 32-byte chunks
        // TODO: We dont always need the third chunk, we might skip it
        const PRK = await Internal.crypto.sign(salt, input)
        const infoBuffer = new ArrayBuffer(info.byteLength + 1 + 32)
        const infoArray = new Uint8Array(infoBuffer)
        infoArray.set(new Uint8Array(info), 32)
        infoArray[infoArray.length - 1] = 1
        const T1 = await Internal.crypto.sign(PRK, infoBuffer.slice(32))
        infoArray.set(new Uint8Array(T1))
        infoArray[infoArray.length - 1] = 2
        const T2 = await Internal.crypto.sign(PRK, infoBuffer)
        infoArray.set(new Uint8Array(T2))
        infoArray[infoArray.length - 1] = 3
        const T3 = await Internal.crypto.sign(PRK, infoBuffer)
        return [T1, T2, T3]
    }

    // Curve25519 crypto

    createKeyPair(privKey?: ArrayBuffer): Promise<KeyPairType> {
        if (!privKey) {
            privKey = this.getRandomBytes(32)
        }
        return this._curve.createKeyPair(privKey)
    }

    ECDHE(pubKey: ArrayBuffer, privKey: ArrayBuffer): Promise<ArrayBuffer> {
        return this._curve.ECDHE(pubKey, privKey)
    }

    Ed25519Sign(privKey: ArrayBuffer, message: ArrayBuffer): Promise<ArrayBuffer> {
        return this._curve.Ed25519Sign(privKey, message)
    }

    Ed25519Verify(pubKey: ArrayBuffer, msg: ArrayBuffer, sig: ArrayBuffer): Promise<boolean> {
        return this._curve.Ed25519Verify(pubKey, msg, sig)
    }
}

export const crypto = new Crypto()