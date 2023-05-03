# Bootnode

`docker run --mount type=bind,source="$(pwd)"/config.json,target=/usr/app/config.json,readonly -p 14337:14337 -p 4337:4337 etherspot/skandha start --testingMode`

# Second node

`./skandha --testingMode --api.port 14338 --p2p.port 4338 --p2p.bootEnrs enr:-LC4QA2eWZeTh0vKmOgY6t-UPZjwxH3J1UuJuw-xydN77pP6QnsjS-PzgTMmGwzrxHiSGgWdv_N7SSDfGY7ob_5JE5IHgmlkgnY0gmlwhH8AAAGLbWVtcG9vbG5ldHOIAAAAAAAAAACJc2VjcDI1NmsxoQNhAe0y6UBjg6RZFs-dqKv5UxBFxSi3iAsowLrxhl9KyoN0Y3CCEPGEdGNwNoIQ8YN1ZHCCEPGEdWRwNoIQ8Q`

# Third node 

`./skandha --testingMode --api.port 14339 --p2p.port 4339 --p2p.bootEnrs enr:-LC4QA2eWZeTh0vKmOgY6t-UPZjwxH3J1UuJuw-xydN77pP6QnsjS-PzgTMmGwzrxHiSGgWdv_N7SSDfGY7ob_5JE5IHgmlkgnY0gmlwhH8AAAGLbWVtcG9vbG5ldHOIAAAAAAAAAACJc2VjcDI1NmsxoQNhAe0y6UBjg6RZFs-dqKv5UxBFxSi3iAsowLrxhl9KyoN0Y3CCEPGEdGNwNoIQ8YN1ZHCCEPGEdWRwNoIQ8Q`