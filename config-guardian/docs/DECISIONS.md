# Decisions

| Decision | Status / reason |
| --- | --- |
| Standalone config-guardian project | User-selected, supersedes earlier suggestion to place it inside Release Guardian |
| Independent package in optional shared repo | Project separation does not require separate repositories |
| YAML, schema version 1 | Proposed single committed source of environment intent |
| React Native with checked-in native projects first | Proposed manageable first adapter scope |
| Separate environment and mode | Preserve stagingDebug/stagingRelease and matching iOS configurations |
| Plan before apply | Make native changes reviewable; prevent silent rewrites |
| Public values only | Mobile bundles cannot keep server secrets |
| Resolve contract for other Guardians | Avoid duplicate native-file ownership |

Open: final npm scope/license; exact parser/editing libraries; tested RN/Xcode/Gradle versions; precise CocoaPods integration; public-value bridge; generated-file layout; adoption flow for pre-existing environments. All operational interfaces are proposed until implemented and verified.
