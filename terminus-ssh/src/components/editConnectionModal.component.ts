import { Component } from '@angular/core'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { ElectronService, HostAppService } from 'terminus-core'
import { PasswordStorageService } from '../services/passwordStorage.service'
import { SSHConnection, LoginScript, SSHAlgorithmType } from '../api'
import { ALGORITHMS } from 'ssh2-streams/lib/constants'

/** @hidden */
@Component({
    template: require('./editConnectionModal.component.pug'),
})
export class EditConnectionModalComponent {
    connection: SSHConnection
    newScript: LoginScript
    hasSavedPassword: boolean

    supportedAlgorithms: {[id: string]: string[]} = {}
    defaultAlgorithms: {[id: string]: string[]} = {}
    algorithms: {[id: string]: {[a: string]: boolean}} = {}

    constructor (
        private modalInstance: NgbActiveModal,
        private electron: ElectronService,
        private hostApp: HostAppService,
        private passwordStorage: PasswordStorageService,
    ) {
        this.newScript = { expect: '', send: '' }

        for (const k of Object.values(SSHAlgorithmType)) {
            const supportedAlg = {
                [SSHAlgorithmType.KEX]: 'SUPPORTED_KEX',
                [SSHAlgorithmType.HOSTKEY]: 'SUPPORTED_SERVER_HOST_KEY',
                [SSHAlgorithmType.CIPHER]: 'SUPPORTED_CIPHER',
                [SSHAlgorithmType.HMAC]: 'SUPPORTED_HMAC',
            }[k]
            const defaultAlg = {
                [SSHAlgorithmType.KEX]: 'KEX',
                [SSHAlgorithmType.HOSTKEY]: 'SERVER_HOST_KEY',
                [SSHAlgorithmType.CIPHER]: 'CIPHER',
                [SSHAlgorithmType.HMAC]: 'HMAC',
            }[k]
            this.supportedAlgorithms[k] = ALGORITHMS[supportedAlg]
            this.defaultAlgorithms[k] = ALGORITHMS[defaultAlg]
        }
    }

    async ngOnInit () {
        this.hasSavedPassword = !!await this.passwordStorage.loadPassword(this.connection)
        this.connection.algorithms = this.connection.algorithms || {}
        for (const k of Object.values(SSHAlgorithmType)) {
            if (!this.connection.algorithms[k]) {
                this.connection.algorithms[k] = this.defaultAlgorithms[k]
            }

            this.algorithms[k] = {}
            for (const alg of this.connection.algorithms[k]) {
                this.algorithms[k][alg] = true
            }
        }
    }

    clearSavedPassword () {
        this.hasSavedPassword = false
        this.passwordStorage.deletePassword(this.connection)
    }

    selectPrivateKey () {
        const path = this.electron.dialog.showOpenDialog(
            this.hostApp.getWindow(),
            {
                title: 'Select private key',
            }
        )
        if (path) {
            this.connection.privateKey = path[0]
        }
    }

    save () {
        for (const k of Object.values(SSHAlgorithmType)) {
            this.connection.algorithms[k] = Object.entries(this.algorithms[k])
                .filter(([_k, v]) => !!v)
                .map(([k, _v]) => k)
        }
        this.modalInstance.close(this.connection)
    }

    cancel () {
        this.modalInstance.dismiss()
    }

    moveScriptUp (script: LoginScript) {
        const index = this.connection.scripts.indexOf(script)
        if (index > 0) {
            this.connection.scripts.splice(index, 1)
            this.connection.scripts.splice(index - 1, 0, script)
        }
    }

    moveScriptDown (script: LoginScript) {
        const index = this.connection.scripts.indexOf(script)
        if (index >= 0 && index < this.connection.scripts.length - 1) {
            this.connection.scripts.splice(index, 1)
            this.connection.scripts.splice(index + 1, 0, script)
        }
    }

    async deleteScript (script: LoginScript) {
        if ((await this.electron.showMessageBox(
            this.hostApp.getWindow(),
            {
                type: 'warning',
                message: 'Delete this script?',
                detail: script.expect,
                buttons: ['Keep', 'Delete'],
                defaultId: 1,
            }
        )).response === 1) {
            this.connection.scripts = this.connection.scripts.filter(x => x !== script)
        }
    }

    addScript () {
        if (!this.connection.scripts) {
            this.connection.scripts = []
        }
        this.connection.scripts.push({ ...this.newScript })
        this.clearScript()
    }

    clearScript () {
        this.newScript.expect = ''
        this.newScript.send = ''
        this.newScript.isRegex = false
        this.newScript.optional = false
    }
}
