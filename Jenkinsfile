pipeline {
  agent {
      docker {
        image 'mcr.microsoft.com/playwright:v1.42.1-jammy'
        args '-u root:root'
        reuseNode true
      }
  }
  options {
    // The buildDiscarder settings limit how long job run histories remain.
    buildDiscarder logRotator(
      daysToKeepStr: '90',
      numToKeepStr: '45',
    )
  }
  stages {
    stage('Installation') {
      steps {
        sh 'npm ci'
      }
    }
    stage('Build') {
      steps {
        script {
          build = sh(script: 'npm run build --force', returnStdout: true, returnStatus: true)
        }
        script {
          if ("${build}" == '0') {
            publishChecks name: 'build', title: 'Build UI', summary: 'Check build output', text: "build process returned status code: ${build}", conclusion: 'SUCCESS', status: 'COMPLETED'
        } else {
            publishChecks name: 'build', title: 'Build UI', summary: 'Check build output', text: "build process returned status code: ${build}", conclusion: 'FAILURE', status: 'COMPLETED'
          }
        }
      }
    }
    stage('Code Checks') {
      parallel {
        stage('lint') {
          steps {
            script {
              lint = sh(script: 'npm run lint', returnStdout: true, returnStatus: true)
            }
            script {
              if ("${lint}" == '0') {
                publishChecks name: 'lint', title: 'ESLint', summary: 'Check lint output', text: "eslint process returned status code: ${lint}", conclusion: 'SUCCESS', status: 'COMPLETED'
            } else {
                publishChecks name: 'lint', title: 'ESLint', summary: 'Check lint output', text: "eslint process returned status code: ${lint}", conclusion: 'FAILURE', status: 'COMPLETED'
              }
            }
          }
        }
        stage('lint-css') {
          steps {
            script {
              lintcss = sh(script: 'npm run lint:css', returnStdout: true, returnStatus: true)
            }
            script {
              if ("${lintcss}" == '0') {
                publishChecks name: 'lint-css', title: 'CSS Style Linting', summary: 'Check lint output', text: "css lint process returned status code: ${lintcss}", conclusion: 'SUCCESS', status: 'COMPLETED'
            } else {
                publishChecks name: 'lint-css', title: 'CSS Style Linting', summary: 'Check lint output', text: "css lint process returned status code: ${lintcss}", conclusion: 'FAILURE', status: 'COMPLETED'
              }
            }
          }
        }
        stage('unit-tests') {
          steps {
            sh 'npm run test:unit'
          }
        }
        stage('e2e-tests') {
          steps {
            sh 'npx playwright test'
          }
        }
      }
    }
  }
  post {
    always {
      withChecks("unit-tests") {
        junit 'unit-test-results/junit-results.xml'
      }
      withChecks("e2e-tests") {
        publishHTML([allowMissing: false, alwaysLinkToLastBuild: false, keepAll: false, reportDir: 'e2e-test-results', reportFiles: 'index.html', reportName: 'HTML Report', useWrapperFileDirectly: true])
        junit 'e2e-test-results/junit-results.xml'
      }
      cleanWs()
    }
  }
}
