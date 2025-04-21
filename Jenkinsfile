pipeline {
  agent {
    label 'cae-linux-build'
  }

  tools {
    nodejs 'node20'
  }

  environment {
    DOCKER_IMAGE_NAME = 'mango-ui'
    CERT_FILE = 'CERT_PEM'
    KEY_FILE = 'KEY_PEM'
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

    stage('Read Config into env') {
      steps {
        script {
          configFileProvider([configFile(fileId: 'e094671f-4052-4346-b308-5ded6d3b9098', variable: 'configFile')]) {
            def props = readProperties file: "$configFile"
            env.ARTIFACTORY_URL = props['ARTIFACTORY_URL']
            env.ARTIFACTORY_REPO = props['ARTIFACTORY_REPO']
          }
        }
      }
    }

    stage('Inject Certificates') {
        steps {
            script {
          withCredentials([file(credentialsId: CERT_FILE, variable: 'CERT_FILE'),
                                     file(credentialsId: KEY_FILE, variable: 'KEY_FILE')]) {
            sh """
                        mkdir -p ./.cert
                        cp "\${CERT_FILE}" ./.cert/cert.pem
                        cp "\${KEY_FILE}" ./.cert/key.pem
                        """
                                     }
            }
        }
    }

    stage('Build UI') {
      steps {
        script {
            def build = sh(script: 'npm run build --force', returnStdout: true, returnStatus: true)
            if (build == 0) {
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
                error "eslint process returned status code: ${lint}"
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
                error "css lint process returned status code: ${lint}"
              }
            }
          }
        }
      }
    }

    stage('Tests') {
      parallel {
        stage('unit-tests') {
          agent {
            docker {
              image 'mcr.microsoft.com/playwright:v1.49.0-noble'
              args '-v /unit-test-results:/unit-test-results'
              args '-u root:root'
              reuseNode true
            }
          }
          steps {
            sh 'npm run test:unit'
          }
        }
        stage('e2e-tests') {
          agent {
            docker {
              image 'mcr.microsoft.com/playwright:v1.49.0-noble'
              args '-v /e2e-test-results:/e2e-test-results'
              args '-u root:root'
              reuseNode true
            }
          }
          steps {
            sh 'npx playwright test'
          }
        }
      }
    }

    stage('Build Docker Image') {
      when {
        allOf {
          anyOf {
            // Trigger docker builds off develop, main, or tags
            branch 'develop'
            branch 'main'
            tag '*'
          }
          expression {
            currentBuild.currentResult == 'SUCCESS'
          }
        }
      }
      steps {
          script {
              DOCKER_IMAGE_VERSION = env.GIT_BRANCH.replaceAll('/', '_')
              ARTIFACTORY_TAG = "${env.ARTIFACTORY_URL}/${env.ARTIFACTORY_REPO}/${env.DOCKER_IMAGE_NAME}:${DOCKER_IMAGE_VERSION}"
              docker.build("${ARTIFACTORY_TAG}", '-f Dockerfile .')
          }
      }
    }

    stage('Deploy to Artifactory') {
      when {
        allOf {
          anyOf {
            // Trigger push to Artifactory off develop, main, or tags
            branch 'develop'
            branch 'main'
            tag '*'
          }
          expression {
            currentBuild.currentResult == 'SUCCESS'
          }
        }
      }
      steps {
        script {
          withCredentials([usernamePassword(credentialsId: 'artifactory-credentials', usernameVariable: 'ARTIFACTORY_USER', passwordVariable: 'ARTIFACTORY_PASSWORD')]) {
            sh "docker login -u ${ARTIFACTORY_USER} -p ${ARTIFACTORY_PASSWORD} ${env.ARTIFACTORY_URL}"
            sh "docker push ${ARTIFACTORY_TAG}"
          }
        }
      }
    }
  }
  post {
    always {
      withChecks('unit-tests') {
        junit 'unit-test-results/junit-results.xml'
      }
      withChecks('e2e-tests') {
        publishHTML([allowMissing: false, alwaysLinkToLastBuild: false, keepAll: false, reportDir: 'e2e-test-results', reportFiles: 'index.html', reportName: 'HTML Report', useWrapperFileDirectly: true])
        junit 'e2e-test-results/junit-results.xml'
      }
      cleanWs()
    }
  }
}
