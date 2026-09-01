Unicode true
ManifestDPIAware true
ManifestDPIAwareness PerMonitorV2

!if "{{compression}}" == "none"
  SetCompress off
!else
  SetCompressor /SOLID "{{compression}}"
!endif

{{#if signed_plugins_path}}
!addplugindir "{{signed_plugins_path}}"
{{/if}}

!include MUI2.nsh
!include FileFunc.nsh
!include x64.nsh
!include WordFunc.nsh
!include "utils.nsh"
!include "FileAssociation.nsh"
!include "Win\COM.nsh"
!include "Win\Propkey.nsh"
!include "StrFunc.nsh"
${StrCase}
${StrLoc}

{{#if installer_hooks}}
!include "{{installer_hooks}}"
{{/if}}

; ============================================
; Tauri Defines (preserved from original)
; ============================================
!define WEBVIEW2APPGUID "{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}"
!define MANUFACTURER "{{manufacturer}}"
!define PRODUCTNAME "{{product_name}}"
!define VERSION "{{version}}"
!define VERSIONWITHBUILD "{{version_with_build}}"
!define HOMEPAGE "{{homepage}}"
!define INSTALLMODE "{{install_mode}}"
!define LICENSE "{{license}}"
!define INSTALLERICON "{{installer_icon}}"
!define SIDEBARIMAGE "{{sidebar_image}}"
!define HEADERIMAGE "{{header_image}}"
!define UNINSTALLERICON "{{uninstaller_icon}}"
!define UNINSTALLERHEADERIMAGE "{{uninstaller_header_image}}"
!define MAINBINARYNAME "{{main_binary_name}}"
!define MAINBINARYSRCPATH "{{main_binary_path}}"
!define BUNDLEID "{{bundle_id}}"
!define COPYRIGHT "{{copyright}}"
!define OUTFILE "{{out_file}}"
!define ARCH "{{arch}}"
!define ADDITIONALPLUGINSPATH "{{additional_plugins_path}}"
!define ALLOWDOWNGRADES "{{allow_downgrades}}"
!define DISPLAYLANGUAGESELECTOR "{{display_language_selector}}"
!define INSTALLWEBVIEW2MODE "{{install_webview2_mode}}"
!define WEBVIEW2INSTALLERARGS "{{webview2_installer_args}}"
!define WEBVIEW2BOOTSTRAPPERPATH "{{webview2_bootstrapper_path}}"
!define WEBVIEW2INSTALLERPATH "{{webview2_installer_path}}"
!define MINIMUMWEBVIEW2VERSION "{{minimum_webview2_version}}"
!define UNINSTKEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCTNAME}"
!define MANUKEY "Software\${MANUFACTURER}"
!define MANUPRODUCTKEY "${MANUKEY}\${PRODUCTNAME}"
!define UNINSTALLERSIGNCOMMAND "{{uninstaller_sign_cmd}}"
!define ESTIMATEDSIZE "{{estimated_size}}"
!define STARTMENUFOLDER "{{start_menu_folder}}"

; ============================================
; Custom UI Constants
; ============================================
!define ASSETS_DIR "F:/AppData/TeleAgent/.temp/mw-build/src-tauri/nsis/assets"
!ifndef WS_CHILD
  !define WS_CHILD 0x40000000
!endif
!ifndef WS_VISIBLE
  !define WS_VISIBLE 0x10000000
!endif
!ifndef SS_BITMAP
  !define SS_BITMAP 0x0E
!endif
!ifndef SS_CENTERIMAGE
  !define SS_CENTERIMAGE 0x0200
!endif
!ifndef SS_REALSIZECONTROL
  !define SS_REALSIZECONTROL 0x0800
!endif
!ifndef STM_SETIMAGE
  !define STM_SETIMAGE 0x0172
!endif
!ifndef IMAGE_BITMAP
  !define IMAGE_BITMAP 0
!endif
!ifndef LR_LOADFROMFILE
  !define LR_LOADFROMFILE 0x0010
!endif
!ifndef LR_DEFAULTSIZE
  !define LR_DEFAULTSIZE 0x0040
!endif
!ifndef SW_HIDE
  !define SW_HIDE 0
!endif
!ifndef SW_SHOW
  !define SW_SHOW 5
!endif
!ifndef SWP_NOZORDER
  !define SWP_NOZORDER 0x0004
!endif
!ifndef HWND_BOTTOM
  !define HWND_BOTTOM 1
!endif

; ============================================
; Variables
; ============================================
Var PassiveMode
Var UpdateMode
Var NoShortcutMode
Var WixMode
Var OldMainBinaryName
; Custom UI variables
Var ReinstallPageCheck
Var HwndBg
Var HwndRing
Var HwndStatus
Var HwndLabelPath
Var BtnQuick
Var BtnCustom
Var ChkDesktop
Var ChkLaunch
Var BgBitmapHandle
Var RingBitmapHandle
Var OldRingBitmap
Var CurrentProgress
Var InstDialogHwnd

Name "${PRODUCTNAME}"
BrandingText "${COPYRIGHT}"
OutFile "${OUTFILE}"

!define PLACEHOLDER_INSTALL_DIR "placeholder\${PRODUCTNAME}"
InstallDir "${PLACEHOLDER_INSTALL_DIR}"

VIProductVersion "${VERSIONWITHBUILD}"
VIAddVersionKey "ProductName" "${PRODUCTNAME}"
VIAddVersionKey "FileDescription" "${PRODUCTNAME}"
VIAddVersionKey "LegalCopyright" "${COPYRIGHT}"
VIAddVersionKey "FileVersion" "${VERSION}"
VIAddVersionKey "ProductVersion" "${VERSION}"

!addplugindir "${ADDITIONALPLUGINSPATH}"

!if "${UNINSTALLERSIGNCOMMAND}" != ""
  !uninstfinalize '${UNINSTALLERSIGNCOMMAND}'
!endif

!if "${INSTALLMODE}" == "perMachine"
  RequestExecutionLevel admin
!endif
!if "${INSTALLMODE}" == "currentUser"
  RequestExecutionLevel user
!endif

!if "${INSTALLMODE}" == "both"
  !define MULTIUSER_MUI
  !define MULTIUSER_INSTALLMODE_INSTDIR "${PRODUCTNAME}"
  !define MULTIUSER_INSTALLMODE_COMMANDLINE
  !if "${ARCH}" == "x64"
    !define MULTIUSER_USE_PROGRAMFILES64
  !else if "${ARCH}" == "arm64"
    !define MULTIUSER_USE_PROGRAMFILES64
  !endif
  !define MULTIUSER_INSTALLMODE_DEFAULT_REGISTRY_KEY "${UNINSTKEY}"
  !define MULTIUSER_INSTALLMODE_DEFAULT_REGISTRY_VALUENAME "CurrentUser"
  !define MULTIUSER_INSTALLMODEPAGE_SHOWUSERNAME
  !define MULTIUSER_INSTALLMODE_FUNCTION RestorePreviousInstallLocation
  !define MULTIUSER_EXECUTIONLEVEL Highest
  !include MultiUser.nsh
!endif

; Installer icon
!if "${INSTALLERICON}" != ""
  !define MUI_ICON "${INSTALLERICON}"
!endif

; Installer sidebar image
!if "${SIDEBARIMAGE}" != ""
  !define MUI_WELCOMEFINISHPAGE_BITMAP "${SIDEBARIMAGE}"
!endif

; Enable header images when configured
!if "${HEADERIMAGE}" != ""
  !define MUI_HEADERIMAGE
!else if "${UNINSTALLERHEADERIMAGE}" != ""
  !define MUI_HEADERIMAGE
!endif
!if "${HEADERIMAGE}" != ""
  !define MUI_HEADERIMAGE_BITMAP "${HEADERIMAGE}"
!endif
!if "${UNINSTALLERHEADERIMAGE}" != ""
  !define MUI_HEADERIMAGE_UNBITMAP "${UNINSTALLERHEADERIMAGE}"
!endif

; Uninstaller icon
!if "${UNINSTALLERICON}" != ""
  !define MUI_UNICON "${UNINSTALLERICON}"
!endif

!define MUI_LANGDLL_REGISTRY_ROOT "HKCU"
!define MUI_LANGDLL_REGISTRY_KEY "${MANUPRODUCTKEY}"
!define MUI_LANGDLL_REGISTRY_VALUENAME "Installer Language"

; ============================================
; Helper: Move standard NSIS buttons off-screen (keep functional)
; Moves buttons off-screen instead of hiding them so page navigation still works
; ============================================
!macro HideStandardControls
  ; Move standard buttons off-screen (not hide - hiding breaks navigation)
  GetDlgItem $9 $HWNDPARENT 1   ; Back
  ShowWindow $9 ${SW_HIDE}
  GetDlgItem $9 $HWNDPARENT 3   ; Cancel
  ShowWindow $9 ${SW_HIDE}
  ; Next button (ID 2) - shrink to 1x1 and move off-screen, keep enabled
  GetDlgItem $9 $HWNDPARENT 2
  System::Call 'user32::SetWindowPos(p $9, p 0, i -100, i -100, i 1, i 1, i 0x0014)'  ; SWP_NOZORDER|SWP_NOACTIVATE
  ; Hide header bitmap + text (IDs 1046, 1037, 1038)
  GetDlgItem $9 $HWNDPARENT 1046
  ShowWindow $9 ${SW_HIDE}
  GetDlgItem $9 $HWNDPARENT 1037
  ShowWindow $9 ${SW_HIDE}
  GetDlgItem $9 $HWNDPARENT 1038
  ShowWindow $9 ${SW_HIDE}
  ; Hide branding text (bottom NSIS version text) - ID 1256
  GetDlgItem $9 $HWNDPARENT 1256
  ShowWindow $9 ${SW_HIDE}
  ; Hide inner dialog background (gray 1018 dialog) - make it transparent
  FindWindow $9 "#32770" "" $HWNDPARENT
  ; Set the inner dialog to not have a visible gray background
  System::Call 'user32::SetWindowLongW(p $9, i -16, i 0x40000000) i .s' ; WS_CHILD only, no visible border
!macroend

; ============================================
; Helper: Paint background on outer window
; Creates a bitmap child window covering entire outer window client area
; ============================================
!macro PaintBackground BMP_FILE
  ; Get outer window client rect
  System::Call '*(i 0, i 0, i 0, i 0) i .r8'
  System::Call 'user32::GetClientRect(p $HWNDPARENT, p r8) i .s'
  Pop $0
  System::Call '*$8(i .r1, i .r2, i .r3, i .r4)'
  IntOp $5 $3 - $1
  IntOp $6 $4 - $2
  System::Free $8
  ; $5 = width, $6 = height of outer window client area

  ; Create a Static bitmap child window covering entire outer window
  System::Call 'user32::CreateWindowEx(i 0, w "Static", w "", i ${SS_BITMAP}|${WS_CHILD}|${WS_VISIBLE}|${SS_CENTERIMAGE}|${SS_REALSIZECONTROL}, i 0, i 0, i $5, i $6, p $HWNDPARENT, i 5555, i0, i0) i .s'
  Pop $HwndBg
  ; Load bitmap
  System::Call 'user32::LoadImage(i 0, w "${BMP_FILE}", i ${IMAGE_BITMAP}, i 0, i 0, i ${LR_LOADFROMFILE}) i .s'
  Pop $1
  ; Set bitmap to static control
  SendMessage $HwndBg ${STM_SETIMAGE} ${IMAGE_BITMAP} $1
  ; Send it to the very bottom z-order so nsDialogs controls are above it
  System::Call 'user32::SetWindowPos(p $HwndBg, p ${HWND_BOTTOM}, i 0, i 0, i 0, i 0, i 0x0014)'
!macroend

Var BtnQuickClicked
Var BtnFinish
Var BtnFinishClicked

; ============================================
; Custom Welcome Page
; ============================================
Page custom WelcomePageCreate WelcomePageLeave

; ============================================
; Reinstall check page (from original)
; ============================================
Page custom PageReinstall PageLeaveReinstall
Function PageReinstall
  StrCpy $0 0
  wix_loop:
    EnumRegKey $1 HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall" $0
    StrCmp $1 "" wix_loop_done
    IntOp $0 $0 + 1
    ReadRegStr $R0 HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\$1" "DisplayName"
    ReadRegStr $R1 HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\$1" "Publisher"
    StrCmp "$R0$R1" "${PRODUCTNAME}${MANUFACTURER}" 0 wix_loop
    ReadRegStr $R0 HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\$1" "UninstallString"
    ${StrCase} $R1 $R0 "L"
    ${StrLoc} $R0 $R1 "msiexec" ">"
    StrCmp $R0 0 0 wix_loop_done
    StrCpy $WixMode 1
    StrCpy $R6 "SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\$1"
    Goto compare_version
  wix_loop_done:

  ReadRegStr $R0 SHCTX "${UNINSTKEY}" ""
  ReadRegStr $R1 SHCTX "${UNINSTKEY}" "UninstallString"
  ${IfThen} "$R0$R1" == "" ${|} Abort ${|}

  compare_version:
  StrCpy $R4 "$(older)"
  ${If} $WixMode = 1
    ReadRegStr $R0 HKLM "$R6" "DisplayVersion"
  ${Else}
    ReadRegStr $R0 SHCTX "${UNINSTKEY}" "DisplayVersion"
  ${EndIf}
  ${IfThen} $R0 == "" ${|} StrCpy $R4 "$(unknown)" ${|}

  nsis_tauri_utils::SemverCompare "${VERSION}" $R0
  Pop $R0
  ${If} $R0 = 0
    StrCpy $R1 "$(alreadyInstalledLong)"
    StrCpy $R2 "$(addOrReinstall)"
    StrCpy $R3 "$(uninstallApp)"
    !insertmacro MUI_HEADER_TEXT "$(alreadyInstalled)" "$(chooseMaintenanceOption)"
  ${ElseIf} $R0 = 1
    StrCpy $R1 "$(olderOrUnknownVersionInstalled)"
    StrCpy $R2 "$(uninstallBeforeInstalling)"
    StrCpy $R3 "$(dontUninstall)"
    !insertmacro MUI_HEADER_TEXT "$(alreadyInstalled)" "$(choowHowToInstall)"
  ${ElseIf} $R0 = -1
    StrCpy $R1 "$(newerVersionInstalled)"
    StrCpy $R2 "$(uninstallBeforeInstalling)"
    !if "${ALLOWDOWNGRADES}" == "true"
      StrCpy $R3 "$(dontUninstall)"
    !else
      StrCpy $R3 "$(dontUninstallDowngrade)"
    !endif
    !insertmacro MUI_HEADER_TEXT "$(alreadyInstalled)" "$(choowHowToInstall)"
  ${Else}
    Abort
  ${EndIf}

  ${If} $PassiveMode = 1
    Call PageLeaveReinstall
  ${Else}
    nsDialogs::Create 1018
    Pop $R4
    ${IfThen} $(^RTL) = 1 ${|} nsDialogs::SetRTL $(^RTL) ${|}
    ${NSD_CreateLabel} 0 0 100% 24u $R1
    Pop $R1
    ${NSD_CreateRadioButton} 30u 50u -30u 8u $R2
    Pop $R2
    ${NSD_OnClick} $R2 PageReinstallUpdateSelection
    ${NSD_CreateRadioButton} 30u 70u -30u 8u $R3
    Pop $R3
    !if "${ALLOWDOWNGRADES}" == "false"
      ${IfThen} $R0 = -1 ${|} EnableWindow $R3 0 ${|}
    !endif
    ${NSD_OnClick} $R3 PageReinstallUpdateSelection
    ${If} $ReinstallPageCheck <> 2
      SendMessage $R2 ${BM_SETCHECK} ${BST_CHECKED} 0
    ${Else}
      SendMessage $R3 ${BM_SETCHECK} ${BST_CHECKED} 0
    ${EndIf}
    ${NSD_SetFocus} $R2
    nsDialogs::Show
  ${EndIf}
FunctionEnd
Function PageReinstallUpdateSelection
  ${NSD_GetState} $R2 $R1
  ${If} $R1 == ${BST_CHECKED}
    StrCpy $ReinstallPageCheck 1
  ${Else}
    StrCpy $ReinstallPageCheck 2
  ${EndIf}
FunctionEnd
Function PageLeaveReinstall
  ${NSD_GetState} $R2 $R1
  ${If} $WixMode = 1
    Goto reinst_uninstall
  ${EndIf}
  ${If} $UpdateMode = 1
    Goto reinst_done
  ${EndIf}
  ${If} $R0 = 0
    ${If} $R1 = 1
      Goto reinst_done
    ${Else}
      Goto reinst_uninstall
    ${EndIf}
  ${ElseIf} $R0 = 1
    ${If} $R1 = 1
      Goto reinst_uninstall
    ${Else}
      Goto reinst_done
    ${EndIf}
  ${ElseIf} $R0 = -1
    ${If} $R1 = 1
      Goto reinst_uninstall
    ${Else}
      Goto reinst_done
    ${EndIf}
  ${EndIf}
  reinst_uninstall:
    HideWindow
    ClearErrors
    ${If} $WixMode = 1
      ReadRegStr $R1 HKLM "$R6" "UninstallString"
      ExecWait '$R1' $0
    ${Else}
      ReadRegStr $4 SHCTX "${MANUPRODUCTKEY}" ""
      ReadRegStr $R1 SHCTX "${UNINSTKEY}" "UninstallString"
      ${IfThen} $UpdateMode = 1 ${|} StrCpy $R1 "$R1 /UPDATE" ${|}
      ${IfThen} $PassiveMode = 1 ${|} StrCpy $R1 "$R1 /P" ${|}
      StrCpy $R1 "$R1 _?=$4"
      ExecWait '$R1' $0
    ${EndIf}
    BringToFront
    ${IfThen} ${Errors} ${|} StrCpy $0 2 ${|}
    ${If} $0 <> 0
    ${OrIf} ${FileExists} "$INSTDIR\${MAINBINARYNAME}.exe"
      ${If} $WixMode = 1
      ${AndIf} $0 = 1602
        Abort
      ${EndIf}
      ${If} $0 = 1
        Abort
      ${EndIf}
      MessageBox MB_ICONEXCLAMATION "$(unableToUninstall)"
      Abort
    ${EndIf}
  reinst_done:
FunctionEnd

; ============================================
; Start Menu Page (hidden - needed for MUI_STARTMENU_WRITE_BEGIN macro)
; ============================================
Var AppStartMenuFolder
!if "${STARTMENUFOLDER}" != ""
  !define MUI_PAGE_CUSTOMFUNCTION_PRE SkipIfPassive
  !define MUI_STARTMENUPAGE_DEFAULTFOLDER "${STARTMENUFOLDER}"
!else
  !define MUI_PAGE_CUSTOMFUNCTION_PRE Skip
!endif
!insertmacro MUI_PAGE_STARTMENU Application $AppStartMenuFolder

; ============================================
; InstFiles Page (customized with ring progress)
; ============================================
!define MUI_PAGE_CUSTOMFUNCTION_PRE SkipIfPassive
!define MUI_PAGE_CUSTOMFUNCTION_SHOW InstFilesShow
!insertmacro MUI_PAGE_INSTFILES

; ============================================
; Custom Finish Page
; ============================================
Page custom FinishPageCreate FinishPageLeave

; ============================================
; Finish page helper functions
; ============================================
Function RunMainBinary
  nsis_tauri_utils::RunAsUser "$INSTDIR\${MAINBINARYNAME}.exe" ""
FunctionEnd

; ============================================
; Uninstaller Pages (from original)
; ============================================
Var DeleteAppDataCheckbox
Var DeleteAppDataCheckboxState
!define /ifndef WS_EX_LAYOUTRTL 0x00400000
!define MUI_PAGE_CUSTOMFUNCTION_SHOW un.ConfirmShow
Function un.ConfirmShow
  FindWindow $1 "#32770" "" $HWNDPARENT
  System::Call "user32::GetDpiForWindow(p r1) i .r2"
  ${If} $(^RTL) = 1
    StrCpy $3 "${__NSD_CheckBox_EXSTYLE} | ${WS_EX_LAYOUTRTL}"
    IntOp $4 50 * $2
  ${Else}
    StrCpy $3 "${__NSD_CheckBox_EXSTYLE}"
    IntOp $4 0 * $2
  ${EndIf}
  IntOp $5 100 * $2
  IntOp $6 400 * $2
  IntOp $7 25 * $2
  IntOp $4 $4 / 96
  IntOp $5 $5 / 96
  IntOp $6 $6 / 96
  IntOp $7 $7 / 96
  System::Call 'user32::CreateWindowEx(i r3, w "${__NSD_CheckBox_CLASS}", w "$(deleteAppData)", i ${__NSD_CheckBox_STYLE}, i r4, i r5, i r6, i r7, p r1, i0, i0, i0) i .s'
  Pop $DeleteAppDataCheckbox
  SendMessage $HWNDPARENT ${WM_GETFONT} 0 0 $1
  SendMessage $DeleteAppDataCheckbox ${WM_SETFONT} $1 1
FunctionEnd
!define MUI_PAGE_CUSTOMFUNCTION_LEAVE un.ConfirmLeave
Function un.ConfirmLeave
  SendMessage $DeleteAppDataCheckbox ${BM_GETCHECK} 0 0 $DeleteAppDataCheckboxState
FunctionEnd
!define MUI_PAGE_CUSTOMFUNCTION_PRE un.SkipIfPassive
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

; ============================================
; Languages
; ============================================
{{#each languages}}
!insertmacro MUI_LANGUAGE "{{this}}"
{{/each}}
!insertmacro MUI_RESERVEFILE_LANGDLL
{{#each language_files}}
  !include "{{this}}"
{{/each}}

; ============================================
; .onInit
; ============================================
Function .onInit
  ${GetOptions} $CMDLINE "/P" $PassiveMode
  ${IfNot} ${Errors}
    StrCpy $PassiveMode 1
  ${EndIf}

  ${GetOptions} $CMDLINE "/NS" $NoShortcutMode
  ${IfNot} ${Errors}
    StrCpy $NoShortcutMode 1
  ${EndIf}

  ${GetOptions} $CMDLINE "/UPDATE" $UpdateMode
  ${IfNot} ${Errors}
    StrCpy $UpdateMode 1
  ${EndIf}

  !if "${DISPLAYLANGUAGESELECTOR}" == "true"
    !insertmacro MUI_LANGDLL_DISPLAY
  !endif

  !insertmacro SetContext

  ${If} $INSTDIR == "${PLACEHOLDER_INSTALL_DIR}"
    !if "${INSTALLMODE}" == "perMachine"
      ${If} ${RunningX64}
        !if "${ARCH}" == "x64"
          StrCpy $INSTDIR "$PROGRAMFILES64\${PRODUCTNAME}"
        !else if "${ARCH}" == "arm64"
          StrCpy $INSTDIR "$PROGRAMFILES64\${PRODUCTNAME}"
        !else
          StrCpy $INSTDIR "$PROGRAMFILES\${PRODUCTNAME}"
        !endif
      ${Else}
        StrCpy $INSTDIR "$PROGRAMFILES\${PRODUCTNAME}"
      ${EndIf}
    !else if "${INSTALLMODE}" == "currentUser"
      StrCpy $INSTDIR "$LOCALAPPDATA\${PRODUCTNAME}"
    !endif
    Call RestorePreviousInstallLocation
  ${EndIf}

  !if "${INSTALLMODE}" == "both"
    !insertmacro MULTIUSER_INIT
  !endif

  ; Extract custom UI assets to plugins dir
  InitPluginsDir
  File /oname=$PLUGINSDIR\bg_welcome.bmp "${ASSETS_DIR}\bg_welcome.bmp"
  File /oname=$PLUGINSDIR\bg_install.bmp "${ASSETS_DIR}\bg_install.bmp"
  File /oname=$PLUGINSDIR\bg_finish.bmp "${ASSETS_DIR}\bg_finish.bmp"
  File /oname=$PLUGINSDIR\ring_00.bmp "${ASSETS_DIR}\ring_00.bmp"
  File /oname=$PLUGINSDIR\ring_01.bmp "${ASSETS_DIR}\ring_01.bmp"
  File /oname=$PLUGINSDIR\ring_02.bmp "${ASSETS_DIR}\ring_02.bmp"
  File /oname=$PLUGINSDIR\ring_03.bmp "${ASSETS_DIR}\ring_03.bmp"
  File /oname=$PLUGINSDIR\ring_04.bmp "${ASSETS_DIR}\ring_04.bmp"
  File /oname=$PLUGINSDIR\ring_05.bmp "${ASSETS_DIR}\ring_05.bmp"
  File /oname=$PLUGINSDIR\ring_06.bmp "${ASSETS_DIR}\ring_06.bmp"
  File /oname=$PLUGINSDIR\ring_07.bmp "${ASSETS_DIR}\ring_07.bmp"
  File /oname=$PLUGINSDIR\ring_08.bmp "${ASSETS_DIR}\ring_08.bmp"
  File /oname=$PLUGINSDIR\ring_09.bmp "${ASSETS_DIR}\ring_09.bmp"
  File /oname=$PLUGINSDIR\ring_10.bmp "${ASSETS_DIR}\ring_10.bmp"
  File /oname=$PLUGINSDIR\ring_11.bmp "${ASSETS_DIR}\ring_11.bmp"
  File /oname=$PLUGINSDIR\ring_12.bmp "${ASSETS_DIR}\ring_12.bmp"
  File /oname=$PLUGINSDIR\ring_13.bmp "${ASSETS_DIR}\ring_13.bmp"
  File /oname=$PLUGINSDIR\ring_14.bmp "${ASSETS_DIR}\ring_14.bmp"
  File /oname=$PLUGINSDIR\ring_15.bmp "${ASSETS_DIR}\ring_15.bmp"
  File /oname=$PLUGINSDIR\ring_16.bmp "${ASSETS_DIR}\ring_16.bmp"
  File /oname=$PLUGINSDIR\ring_17.bmp "${ASSETS_DIR}\ring_17.bmp"
  File /oname=$PLUGINSDIR\ring_18.bmp "${ASSETS_DIR}\ring_18.bmp"
  File /oname=$PLUGINSDIR\ring_19.bmp "${ASSETS_DIR}\ring_19.bmp"
  File /oname=$PLUGINSDIR\ring_20.bmp "${ASSETS_DIR}\ring_20.bmp"

  StrCpy $CurrentProgress 0
FunctionEnd

; ============================================
; Custom Welcome Page Functions
; ============================================
Function WelcomePageCreate
  ${If} $PassiveMode = 1
    Abort
  ${EndIf}
  StrCpy $BtnQuickClicked 0
  !insertmacro MUI_HEADER_TEXT "" ""
  nsDialogs::Create 1018
  Pop $0
  ${IfThen} $(^RTL) = 1 ${|} nsDialogs::SetRTL $(^RTL) ${|}

  ; Hide all standard NSIS controls (buttons, header, branding text)
  !insertmacro HideStandardControls

  ; Paint background on outer window (covers entire window)
  !insertmacro PaintBackground "$PLUGINSDIR\bg_welcome.bmp"

  ; Path display label (shows current install path)
  ${NSD_CreateLabel} 10% 82% 80% 12u ""
  Pop $HwndLabelPath
  SetCtlColors $HwndLabelPath 0xFFFFFF transparent
  CreateFont $1 "$(^Font)" 9 400
  SendMessage $HwndLabelPath ${WM_SETFONT} $1 0
  SendMessage $HwndLabelPath ${WM_SETTEXT} 0 "STR:安装路径: $INSTDIR"

  ; "快速安装" button - centered, filled blue
  ${NSD_CreateButton} 30% 58% 40% 18u "快速安装"
  Pop $BtnQuick
  SetCtlColors $BtnQuick 0xFFFFFF 0x0078D4

  ; "自定义路径" button - bottom right
  ${NSD_CreateButton} 55% 72% 40% 14u "自定义路径"
  Pop $BtnCustom

  ${NSD_OnClick} $BtnQuick WelcomeBtnQuick
  ${NSD_OnClick} $BtnCustom WelcomeBtnCustom

  nsDialogs::Show
FunctionEnd

Function WelcomeBtnQuick
  ; Simulate clicking the Next button to navigate forward
  ; NSIS MUI2: Next button has ID 2 on $HWNDPARENT
  GetDlgItem $0 $HWNDPARENT 2
  ; Use PostMessageW via System plugin for async delivery
  System::Call 'user32::PostMessageW(p $HWNDPARENT, i 0x111, i 2, p $0) i .s'
FunctionEnd

Function WelcomeBtnCustom
  ; Open folder selection dialog
  nsDialogs::SelectFolderDialog "选择安装路径" "$INSTDIR"
  Pop $0
  ${If} $0 != "error"
  ${AndIf} $0 != ""
    StrCpy $INSTDIR $0
    ; Update path display
    SendMessage $HwndLabelPath ${WM_SETTEXT} 0 "STR:安装路径: $INSTDIR"
  ${EndIf}
FunctionEnd

Function WelcomePageLeave
  ; Proceed to next page (InstFiles)
FunctionEnd

; ============================================
; InstFiles Show - custom ring progress
; ============================================
Function InstFilesShow
  ; Find inner dialog
  FindWindow $0 "#32770" "" $HWNDPARENT
  StrCpy $InstDialogHwnd $0

  ; Hide ALL standard controls on inner dialog
  ; Show Details button (ID 0x404)
  GetDlgItem $1 $0 0x404
  ShowWindow $1 ${SW_HIDE}
  ; Progress bar (ID 0x406)
  GetDlgItem $1 $0 0x406
  ShowWindow $1 ${SW_HIDE}
  ; Details list (ID 0x405)
  GetDlgItem $1 $0 0x405
  ShowWindow $1 ${SW_HIDE}

  ; Hide all standard NSIS outer-window controls
  !insertmacro HideStandardControls

  ; Paint background on outer window
  !insertmacro PaintBackground "$PLUGINSDIR\bg_install.bmp"

  ; Create ring bitmap (centered, 120x120) on inner dialog
  System::Call 'user32::CreateWindowEx(i 0, w "Static", w "", i ${SS_BITMAP}|${WS_CHILD}|${WS_VISIBLE}|${SS_CENTERIMAGE}, i 190, 80, 120, 120, p $0, i1, i0, i0) i .s'
  Pop $HwndRing
  System::Call 'user32::LoadImage(i 0, w "$PLUGINSDIR\ring_00.bmp", i ${IMAGE_BITMAP}, i 0, i 0, i ${LR_LOADFROMFILE}) i .s'
  Pop $RingBitmapHandle
  SendMessage $HwndRing ${STM_SETIMAGE} ${IMAGE_BITMAP} $RingBitmapHandle

  ; Create status text label (below ring) - white text with transparent bg
  System::Call 'user32::CreateWindowEx(i 0x20, w "Static", w "准备安装...", i ${WS_CHILD}|${WS_VISIBLE}|0x1, i 100, 210, 300, 30, p $0, i2, i0, i0) i .s'
  Pop $HwndStatus
  ; Set text color to white via SetWindowLong + subclass
  ; Use SetCtlColors equivalent for System-created control
  SetCtlColors $HwndStatus 0xFFFFFF transparent
FunctionEnd

; ============================================
; Ring Progress Update Macro
; ============================================
!macro UpdateRing pct
  IntOp $0 ${pct} / 5
  ${If} $0 > 20
    StrCpy $0 20
  ${EndIf}
  IntFmt $1 "ring_%02d.bmp" $0
  System::Call 'user32::LoadImage(i 0, w "$PLUGINSDIR\$1", i ${IMAGE_BITMAP}, i 0, i 0, i ${LR_LOADFROMFILE}) i .s'
  Pop $2
  SendMessage $HwndRing ${STM_SETIMAGE} ${IMAGE_BITMAP} $2
  Pop $3
  ${If} $3 <> 0
    System::Call 'gdi32::DeleteObject(p $3)'
  ${EndIf}
!macroend

!macro UpdateStatus text
  SendMessage $HwndStatus ${WM_SETTEXT} 0 "STR:${text}"
!macroend

; ============================================
; Sections (from original, with progress updates)
; ============================================
Section EarlyChecks
  !if "${ALLOWDOWNGRADES}" == "false"
  ${If} ${Silent}
    ${If} $R0 = -1
      System::Call 'kernel32::AttachConsole(i -1)i.r0'
      ${If} $0 <> 0
        System::Call 'kernel32::GetStdHandle(i -11)i.r0'
        System::call 'kernel32::SetConsoleTextAttribute(i r0, i 0x0004)'
        FileWrite $0 "$(silentDowngrades)"
      ${EndIf}
      Abort
    ${EndIf}
  ${EndIf}
  !endif
SectionEnd

Section WebView2
  !insertmacro UpdateRing 5
  !insertmacro UpdateStatus "正在检查 WebView2 运行时..."

  ${If} ${RunningX64}
    ReadRegStr $4 HKLM "SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\${WEBVIEW2APPGUID}" "pv"
  ${Else}
    ReadRegStr $4 HKLM "SOFTWARE\Microsoft\EdgeUpdate\Clients\${WEBVIEW2APPGUID}" "pv"
  ${EndIf}
  ${If} $4 == ""
    ReadRegStr $4 HKCU "SOFTWARE\Microsoft\EdgeUpdate\Clients\${WEBVIEW2APPGUID}" "pv"
  ${EndIf}

  ${If} $4 == ""
    ${If} $UpdateMode <> 1
      !if "${INSTALLWEBVIEW2MODE}" == "downloadBootstrapper"
        Delete "$TEMP\MicrosoftEdgeWebview2Setup.exe"
        DetailPrint "$(webview2Downloading)"
        NSISdl::download "https://go.microsoft.com/fwlink/p/?LinkId=2124703" "$TEMP\MicrosoftEdgeWebview2Setup.exe"
        Pop $0
        ${If} $0 == "success"
          DetailPrint "$(webview2DownloadSuccess)"
        ${Else}
          DetailPrint "$(webview2DownloadError)"
          Abort "$(webview2AbortError)"
        ${EndIf}
        StrCpy $6 "$TEMP\MicrosoftEdgeWebview2Setup.exe"
        Goto install_webview2
      !endif
      !if "${INSTALLWEBVIEW2MODE}" == "embedBootstrapper"
        Delete "$TEMP\MicrosoftEdgeWebview2Setup.exe"
        File "/oname=$TEMP\MicrosoftEdgeWebview2Setup.exe" "${WEBVIEW2BOOTSTRAPPERPATH}"
        DetailPrint "$(installingWebview2)"
        StrCpy $6 "$TEMP\MicrosoftEdgeWebview2Setup.exe"
        Goto install_webview2
      !endif
      !if "${INSTALLWEBVIEW2MODE}" == "offlineInstaller"
        Delete "$TEMP\MicrosoftEdgeWebView2RuntimeInstaller.exe"
        File "/oname=$TEMP\MicrosoftEdgeWebView2RuntimeInstaller.exe" "${WEBVIEW2INSTALLERPATH}"
        DetailPrint "$(installingWebview2)"
        StrCpy $6 "$TEMP\MicrosoftEdgeWebView2RuntimeInstaller.exe"
        Goto install_webview2
      !endif
      Goto webview2_done
      install_webview2:
        DetailPrint "$(installingWebview2)"
        ExecWait "$6 ${WEBVIEW2INSTALLERARGS} /install" $1
        ${If} $1 = 0
          DetailPrint "$(webview2InstallSuccess)"
        ${Else}
          DetailPrint "$(webview2InstallError)"
          Abort "$(webview2AbortError)"
        ${EndIf}
      webview2_done:
    ${EndIf}
  ${Else}
    !if "${MINIMUMWEBVIEW2VERSION}" != ""
      ${VersionCompare} "${MINIMUMWEBVIEW2VERSION}" "$4" $R0
      ${If} $R0 = 1
        update_webview:
          DetailPrint "$(installingWebview2)"
          ${If} ${RunningX64}
            ReadRegStr $R1 HKLM "SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate" "path"
          ${Else}
            ReadRegStr $R1 HKLM "SOFTWARE\Microsoft\EdgeUpdate" "path"
          ${EndIf}
          ${If} $R1 == ""
            ReadRegStr $R1 HKCU "SOFTWARE\Microsoft\EdgeUpdate" "path"
          ${EndIf}
          ${If} $R1 != ""
            ExecWait `"$R1" /install appguid=${WEBVIEW2APPGUID}&needsadmin=true` $1
            ${If} $1 = 0
              DetailPrint "$(webview2InstallSuccess)"
            ${Else}
              MessageBox MB_ICONEXCLAMATION|MB_ABORTRETRYIGNORE "$(webview2InstallError)" IDIGNORE ignore IDRETRY update_webview
              Quit
              ignore:
            ${EndIf}
          ${EndIf}
      ${EndIf}
    !endif
  ${EndIf}
SectionEnd

Section Install
  SetOutPath $INSTDIR
  SetDetailsPrint none

  !ifmacrodef NSIS_HOOK_PREINSTALL
    !insertmacro NSIS_HOOK_PREINSTALL
  !endif

  !insertmacro CheckIfAppIsRunning "${MAINBINARYNAME}.exe" "${PRODUCTNAME}"

  !insertmacro UpdateRing 10
  !insertmacro UpdateStatus "正在安装 ${PRODUCTNAME}..."

  ; Copy main executable
  File "${MAINBINARYSRCPATH}"

  !insertmacro UpdateRing 30
  !insertmacro UpdateStatus "正在复制资源文件..."

  ; Copy resources
  {{#each resources_dirs}}
    CreateDirectory "$INSTDIR\\{{this}}"
  {{/each}}
  {{#each resources}}
    File /a "/oname={{this.[1]}}" "{{no-escape @key}}"
  {{/each}}

  ; Copy external binaries
  {{#each binaries}}
    File /a "/oname={{this}}" "{{no-escape @key}}"
  {{/each}}

  !insertmacro UpdateRing 50
  !insertmacro UpdateStatus "正在创建文件关联..."

  ; Create file associations
  {{#each file_associations as |association| ~}}
    {{#each association.ext as |ext| ~}}
       !insertmacro APP_ASSOCIATE "{{ext}}" "{{or association.name ext}}" "{{association-description association.description ext}}" "$INSTDIR\${MAINBINARYNAME}.exe,0" "Open with ${PRODUCTNAME}" "$INSTDIR\${MAINBINARYNAME}.exe $\"%1$\""
    {{/each}}
  {{/each}}

  ; Register deep links
  {{#each deep_link_protocols as |protocol| ~}}
    WriteRegStr SHCTX "Software\Classes\\{{protocol}}" "URL Protocol" ""
    WriteRegStr SHCTX "Software\Classes\\{{protocol}}" "" "URL:${BUNDLEID} protocol"
    WriteRegStr SHCTX "Software\Classes\\{{protocol}}\DefaultIcon" "" "$\"$INSTDIR\${MAINBINARYNAME}.exe$\",0"
    WriteRegStr SHCTX "Software\Classes\\{{protocol}}\shell\open\command" "" "$\"$INSTDIR\${MAINBINARYNAME}.exe$\" $\"%1$\""
  {{/each}}

  !insertmacro UpdateRing 65
  !insertmacro UpdateStatus "正在创建卸载程序..."

  ; Create uninstaller
  WriteUninstaller "$INSTDIR\uninstall.exe"

  ; Save $INSTDIR in registry
  WriteRegStr SHCTX "${MANUPRODUCTKEY}" "" $INSTDIR

  !if "${INSTALLMODE}" == "both"
    WriteRegStr SHCTX "${UNINSTKEY}" $MultiUser.InstallMode 1
  !endif

  ; Remove old main binary if name changed
  ReadRegStr $OldMainBinaryName SHCTX "${UNINSTKEY}" "MainBinaryName"
  ${If} $OldMainBinaryName != ""
  ${AndIf} $OldMainBinaryName != "${MAINBINARYNAME}.exe"
    Delete "$INSTDIR\$OldMainBinaryName"
  ${EndIf}

  WriteRegStr SHCTX "${UNINSTKEY}" "MainBinaryName" "${MAINBINARYNAME}.exe"

  !insertmacro UpdateRing 75
  !insertmacro UpdateStatus "正在写入注册表信息..."

  ; Registry information for add/remove programs
  WriteRegStr SHCTX "${UNINSTKEY}" "DisplayName" "${PRODUCTNAME}"
  WriteRegStr SHCTX "${UNINSTKEY}" "DisplayIcon" "$\"$INSTDIR\${MAINBINARYNAME}.exe$\""
  WriteRegStr SHCTX "${UNINSTKEY}" "DisplayVersion" "${VERSION}"
  WriteRegStr SHCTX "${UNINSTKEY}" "Publisher" "${MANUFACTURER}"
  WriteRegStr SHCTX "${UNINSTKEY}" "InstallLocation" "$\"$INSTDIR$\""
  WriteRegStr SHCTX "${UNINSTKEY}" "UninstallString" "$\"$INSTDIR\uninstall.exe$\""
  WriteRegDWORD SHCTX "${UNINSTKEY}" "NoModify" "1"
  WriteRegDWORD SHCTX "${UNINSTKEY}" "NoRepair" "1"

  ${GetSize} "$INSTDIR" "/M=uninstall.exe /S=0K /G=0" $0 $1 $2
  IntOp $0 $0 + ${ESTIMATEDSIZE}
  IntFmt $0 "0x%08X" $0
  WriteRegDWORD SHCTX "${UNINSTKEY}" "EstimatedSize" "$0"

  !if "${HOMEPAGE}" != ""
    WriteRegStr SHCTX "${UNINSTKEY}" "URLInfoAbout" "${HOMEPAGE}"
    WriteRegStr SHCTX "${UNINSTKEY}" "URLUpdateInfo" "${HOMEPAGE}"
    WriteRegStr SHCTX "${UNINSTKEY}" "HelpLink" "${HOMEPAGE}"
  !endif

  !insertmacro UpdateRing 85
  !insertmacro UpdateStatus "正在创建快捷方式..."

  ; Create start menu shortcut
  !insertmacro MUI_STARTMENU_WRITE_BEGIN Application
    Call CreateOrUpdateStartMenuShortcut
  !insertmacro MUI_STARTMENU_WRITE_END

  ; Create desktop shortcut for silent/passive mode
  ${If} $PassiveMode = 1
  ${OrIf} ${Silent}
    Call CreateOrUpdateDesktopShortcut
  ${EndIf}

  !ifmacrodef NSIS_HOOK_POSTINSTALL
    !insertmacro NSIS_HOOK_POSTINSTALL
  !endif

  !insertmacro UpdateRing 95
  !insertmacro UpdateStatus "即将完成..."

  ${If} $PassiveMode = 1
    SetAutoClose true
  ${EndIf}
SectionEnd

Function .onInstSuccess
  !insertmacro UpdateRing 100
  !insertmacro UpdateStatus "安装完成!"

  ${If} $PassiveMode = 1
  ${OrIf} ${Silent}
    ${GetOptions} $CMDLINE "/R" $R0
    ${IfNot} ${Errors}
      ${GetOptions} $CMDLINE "/ARGS" $R0
      nsis_tauri_utils::RunAsUser "$INSTDIR\${MAINBINARYNAME}.exe" "$R0"
    ${EndIf}
  ${EndIf}
FunctionEnd

; ============================================
; Custom Finish Page Functions
; ============================================
Function FinishPageCreate
  nsDialogs::Create 1018
  Pop $0
  ${IfThen} $(^RTL) = 1 ${|} nsDialogs::SetRTL $(^RTL) ${|}

  ; Hide all standard NSIS controls
  !insertmacro HideStandardControls

  ; Paint background on outer window
  !insertmacro PaintBackground "$PLUGINSDIR\bg_finish.bmp"

  ; "创建桌面快捷方式" checkbox
  ${NSD_CreateCheckbox} 25% 55% 50% 12u "创建桌面快捷方式"
  Pop $ChkDesktop
  SetCtlColors $ChkDesktop 0xFFFFFF transparent
  SendMessage $ChkDesktop ${BM_SETCHECK} ${BST_CHECKED} 0

  ; "打开 MasterWorkbench" checkbox
  ${NSD_CreateCheckbox} 25% 67% 50% 12u "打开 MasterWorkbench"
  Pop $ChkLaunch
  SetCtlColors $ChkLaunch 0xFFFFFF transparent
  SendMessage $ChkLaunch ${BM_SETCHECK} ${BST_CHECKED} 0

  ; "完成" button - centered, filled blue
  StrCpy $BtnFinishClicked 0
  ${NSD_CreateButton} 30% 82% 40% 18u "完成"
  Pop $BtnFinish
  SetCtlColors $BtnFinish 0xFFFFFF 0x0078D4
  ${NSD_OnClick} $BtnFinish FinishBtnClick

  nsDialogs::Show
FunctionEnd

Function FinishBtnClick
  ; Simulate clicking the Next button to close finish page
  GetDlgItem $0 $HWNDPARENT 2
  System::Call 'user32::PostMessageW(p $HWNDPARENT, i 0x111, i 2, p $0) i .s'
FunctionEnd

Function FinishPageLeave
  ; Check desktop shortcut checkbox
  ${NSD_GetState} $ChkDesktop $0
  ${If} $0 = ${BST_CHECKED}
    Call CreateOrUpdateDesktopShortcut
  ${EndIf}

  ; Check launch app checkbox
  ${NSD_GetState} $ChkLaunch $0
  ${If} $0 = ${BST_CHECKED}
    Call RunMainBinary
  ${EndIf}
FunctionEnd

; ============================================
; Uninstaller Init
; ============================================
Function un.onInit
  !insertmacro SetContext
  !if "${INSTALLMODE}" == "both"
    !insertmacro MULTIUSER_UNINIT
  !endif
  !insertmacro MUI_UNGETLANGUAGE
  ${GetOptions} $CMDLINE "/P" $PassiveMode
  ${IfNot} ${Errors}
    StrCpy $PassiveMode 1
  ${EndIf}
  ${GetOptions} $CMDLINE "/UPDATE" $UpdateMode
  ${IfNot} ${Errors}
    StrCpy $UpdateMode 1
  ${EndIf}
FunctionEnd

; ============================================
; Uninstall Section (from original)
; ============================================
Section Uninstall
  !ifmacrodef NSIS_HOOK_PREUNINSTALL
    !insertmacro NSIS_HOOK_PREUNINSTALL
  !endif

  !insertmacro CheckIfAppIsRunning "${MAINBINARYNAME}.exe" "${PRODUCTNAME}"

  Delete "$INSTDIR\${MAINBINARYNAME}.exe"

  {{#each resources}}
    Delete "$INSTDIR\\{{this.[1]}}"
  {{/each}}

  {{#each binaries}}
    Delete "$INSTDIR\\{{this}}"
  {{/each}}

  {{#each file_associations as |association| ~}}
    {{#each association.ext as |ext| ~}}
      !insertmacro APP_UNASSOCIATE "{{ext}}" "{{or association.name ext}}"
    {{/each}}
  {{/each}}

  {{#each deep_link_protocols as |protocol| ~}}
    ReadRegStr $R7 SHCTX "Software\Classes\\{{protocol}}\shell\open\command" ""
    ${If} $R7 == "$\"$INSTDIR\${MAINBINARYNAME}.exe$\" $\"%1$\""
      DeleteRegKey SHCTX "Software\Classes\\{{protocol}}"
    ${EndIf}
  {{/each}}

  Delete "$INSTDIR\uninstall.exe"

  {{#each resources_ancestors}}
  RMDir /REBOOTOK "$INSTDIR\\{{this}}"
  {{/each}}
  RMDir "$INSTDIR"

  ${If} $UpdateMode <> 1
    !insertmacro DeleteAppUserModelId
    !insertmacro MUI_STARTMENU_GETFOLDER Application $AppStartMenuFolder
    !insertmacro IsShortcutTarget "$SMPROGRAMS\$AppStartMenuFolder\${PRODUCTNAME}.lnk" "$INSTDIR\${MAINBINARYNAME}.exe"
    Pop $0
    ${If} $0 = 1
      !insertmacro UnpinShortcut "$SMPROGRAMS\$AppStartMenuFolder\${PRODUCTNAME}.lnk"
      Delete "$SMPROGRAMS\$AppStartMenuFolder\${PRODUCTNAME}.lnk"
      RMDir "$SMPROGRAMS\$AppStartMenuFolder"
    ${EndIf}
    !insertmacro IsShortcutTarget "$SMPROGRAMS\${PRODUCTNAME}.lnk" "$INSTDIR\${MAINBINARYNAME}.exe"
    Pop $0
    ${If} $0 = 1
      !insertmacro UnpinShortcut "$SMPROGRAMS\${PRODUCTNAME}.lnk"
      Delete "$SMPROGRAMS\${PRODUCTNAME}.lnk"
    ${EndIf}
    !insertmacro IsShortcutTarget "$DESKTOP\${PRODUCTNAME}.lnk" "$INSTDIR\${MAINBINARYNAME}.exe"
    Pop $0
    ${If} $0 = 1
      !insertmacro UnpinShortcut "$DESKTOP\${PRODUCTNAME}.lnk"
      Delete "$DESKTOP\${PRODUCTNAME}.lnk"
    ${EndIf}
  ${EndIf}

  !if "${INSTALLMODE}" == "both"
    DeleteRegKey SHCTX "${UNINSTKEY}"
  !else if "${INSTALLMODE}" == "perMachine"
    DeleteRegKey HKLM "${UNINSTKEY}"
  !else
    DeleteRegKey HKCU "${UNINSTKEY}"
  !endif

  ${If} $UpdateMode <> 1
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "${PRODUCTNAME}"
  ${EndIf}

  ${If} $DeleteAppDataCheckboxState = 1
  ${AndIf} $UpdateMode <> 1
    DeleteRegKey SHCTX "${MANUPRODUCTKEY}"
    DeleteRegKey /ifempty SHCTX "${MANUKEY}"
    DeleteRegValue HKCU "${MANUPRODUCTKEY}" "Installer Language"
    DeleteRegKey /ifempty HKCU "${MANUPRODUCTKEY}"
    DeleteRegKey /ifempty HKCU "${MANUKEY}"
    SetShellVarContext current
    RmDir /r "$APPDATA\${BUNDLEID}"
    RmDir /r "$LOCALAPPDATA\${BUNDLEID}"
  ${EndIf}

  !ifmacrodef NSIS_HOOK_POSTUNINSTALL
    !insertmacro NSIS_HOOK_POSTUNINSTALL
  !endif

  ${If} $PassiveMode = 1
  ${OrIf} $UpdateMode = 1
    SetAutoClose true
  ${EndIf}
SectionEnd

; ============================================
; Helper Functions (from original)
; ============================================
Function RestorePreviousInstallLocation
  ReadRegStr $4 SHCTX "${MANUPRODUCTKEY}" ""
  StrCmp $4 "" +2 0
    StrCpy $INSTDIR $4
FunctionEnd

Function Skip
  Abort
FunctionEnd

Function SkipIfPassive
  ${IfThen} $PassiveMode = 1  ${|} Abort ${|}
FunctionEnd
Function un.SkipIfPassive
  ${IfThen} $PassiveMode = 1  ${|} Abort ${|}
FunctionEnd

Function CreateOrUpdateStartMenuShortcut
  StrCpy $R0 0
  !insertmacro IsShortcutTarget "$SMPROGRAMS\$AppStartMenuFolder\${PRODUCTNAME}.lnk" "$INSTDIR\$OldMainBinaryName"
  Pop $0
  ${If} $0 = 1
    !insertmacro SetShortcutTarget "$SMPROGRAMS\$AppStartMenuFolder\${PRODUCTNAME}.lnk" "$INSTDIR\${MAINBINARYNAME}.exe"
    StrCpy $R0 1
  ${EndIf}
  !insertmacro IsShortcutTarget "$SMPROGRAMS\${PRODUCTNAME}.lnk" "$INSTDIR\$OldMainBinaryName"
  Pop $0
  ${If} $0 = 1
    !insertmacro SetShortcutTarget "$SMPROGRAMS\${PRODUCTNAME}.lnk" "$INSTDIR\${MAINBINARYNAME}.exe"
    StrCpy $R0 1
  ${EndIf}
  ${If} $R0 = 1
    Return
  ${EndIf}
  ${If} $WixMode = 0
    ${If} $UpdateMode = 1
    ${OrIf} $NoShortcutMode = 1
      Return
    ${EndIf}
  ${EndIf}
  !if "${STARTMENUFOLDER}" != ""
    CreateDirectory "$SMPROGRAMS\$AppStartMenuFolder"
    CreateShortcut "$SMPROGRAMS\$AppStartMenuFolder\${PRODUCTNAME}.lnk" "$INSTDIR\${MAINBINARYNAME}.exe"
    !insertmacro SetLnkAppUserModelId "$SMPROGRAMS\$AppStartMenuFolder\${PRODUCTNAME}.lnk"
  !else
    CreateShortcut "$SMPROGRAMS\${PRODUCTNAME}.lnk" "$INSTDIR\${MAINBINARYNAME}.exe"
    !insertmacro SetLnkAppUserModelId "$SMPROGRAMS\${PRODUCTNAME}.lnk"
  !endif
FunctionEnd

Function CreateOrUpdateDesktopShortcut
  !insertmacro IsShortcutTarget "$DESKTOP\${PRODUCTNAME}.lnk" "$INSTDIR\$OldMainBinaryName"
  Pop $0
  ${If} $0 = 1
    !insertmacro SetShortcutTarget "$DESKTOP\${PRODUCTNAME}.lnk" "$INSTDIR\${MAINBINARYNAME}.exe"
    Return
  ${EndIf}
  ${If} $WixMode = 0
    ${If} $UpdateMode = 1
    ${OrIf} $NoShortcutMode = 1
      Return
    ${EndIf}
  ${EndIf}
  CreateShortcut "$DESKTOP\${PRODUCTNAME}.lnk" "$INSTDIR\${MAINBINARYNAME}.exe"
  !insertmacro SetLnkAppUserModelId "$DESKTOP\${PRODUCTNAME}.lnk"
FunctionEnd
