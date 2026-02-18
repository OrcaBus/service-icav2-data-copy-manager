FROM debian:bookworm

ARG TARGETPLATFORM
ARG CURL_VERSION="8.15.0"
ARG WRAPICA_VERSION="2.40.1.post20260218114718"
ARG PYTHON_VERSION="3.14"

RUN \
  # Set the platform URL based on the TARGETPLATFORM argument \
  if [ "${TARGETPLATFORM#linux/}" = "arm64" ]; then \
    platform_url="aarch64";  \
  else \
    platform_url="x86_64"; \
  fi && \
 # Standard setup \
 apt update -yq && \
 apt upgrade -yq && \
 # APT installations to build curl \
 apt install -yq \
    wget \
    tar \
    jq \
    unzip \
    build-essential \
    libssl-dev \
    libpsl-dev && \
  # Download and install the latest version of curl \
  wget --quiet \
    "https://github.com/curl/curl/releases/download/curl-$(echo "${CURL_VERSION}" | sed 's/\./_/g')/curl-${CURL_VERSION}.tar.gz" && \
  tar -xzf "curl-${CURL_VERSION}.tar.gz" && \
  ( \
    cd "curl-${CURL_VERSION}" && \
    ./configure \
      --prefix=/usr \
      --with-openssl && \
    make && \
    make install && \
    ldconfig \
  ) && \
  rm -rf "curl-${CURL_VERSION}" "curl-${CURL_VERSION}.tar.gz" && \
  # Install uv \
  curl -LsSf https://astral.sh/uv/install.sh | XDG_CONFIG_HOME=/tmp UV_INSTALL_DIR=/usr/bin sh && \
  uv venv --python "${PYTHON_VERSION}" && \
  # Install wrapica \
  # Use --extra-index-url "https://test.pypi.org/simple" when testing new versions of wrapica \
  # Install wrapica \
  uv pip install \
    --index-url "https://pypi.org/simple" \
    --index-strategy unsafe-best-match \
    wrapica=="${WRAPICA_VERSION}" && \
  # Install the aws cli \
  ( \
      wget \
        --quiet \
        --output-document "awscliv2.zip" \
        "https://awscli.amazonaws.com/awscli-exe-linux-${platform_url}.zip" && \
      unzip -q "awscliv2.zip" && \
      ./aws/install && \
      rm -rf "awscliv2.zip" "aws" \
  )


# Install entrypoint script
COPY docker-entrypoint.sh "docker-entrypoint.sh"

# Install the scripts
COPY scripts/ scripts/

# Make the docker entrypoint executable
RUN chmod +x "./docker-entrypoint.sh"

# Set the entrypoint as the docker entrypoint script
CMD [ "./docker-entrypoint.sh" ]
