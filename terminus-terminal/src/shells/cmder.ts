import * as path from 'path'
import { Injectable } from '@angular/core'
import { DomSanitizer } from '@angular/platform-browser'
import { HostAppService, Platform } from 'terminus-core'

import { ShellProvider } from '../api/shellProvider'
import { Shell } from '../api/interfaces'

/** @hidden */
@Injectable()
export class CmderShellProvider extends ShellProvider {
    constructor (
        private domSanitizer: DomSanitizer,
        private hostApp: HostAppService,
    ) {
        super()
    }

    async provide (): Promise<Shell[]> {
        if (this.hostApp.platform !== Platform.Windows) {
            return []
        }

        if (!process.env.CMDER_ROOT) {
            return []
        }

        return [
            {
                id: 'cmder',
                name: 'Cmder',
                command: 'cmd.exe',
                args: [
                    '/k',
                    path.join(process.env.CMDER_ROOT, 'vendor', 'init.bat'),
                ],
                icon: this.domSanitizer.bypassSecurityTrustHtml(require('../icons/cmder.svg')),
                env: {
                    TERM: 'cygwin',
                },
            },
            {
                id: 'cmderps',
                name: 'Cmder PowerShell',
                command: 'powershell.exe',
                args: [
                    '-ExecutionPolicy',
                    'Bypass',
                    '-nologo',
                    '-noprofile',
                    '-noexit',
                    '-command',
                    `Invoke-Expression '. ''${path.join(process.env.CMDER_ROOT, 'vendor', 'profile.ps1')}'''`,
                ],
                icon: this.domSanitizer.bypassSecurityTrustHtml(require('../icons/cmder-powershell.svg')),
                env: {},
            },
        ]
    }
}
